"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireSession } from "@/lib/auth/session";
import { customerOrderSchema } from "@/lib/orders/validation";
import { dispatchCustomerOrder } from "@/lib/orders/shipment";
import { canChangeCustomerOrderStatus, invalidOrderStatusTransitionMessage } from "@/lib/orders/status";
import { releaseReservedStockBalance, reserveStockBalance } from "@/lib/stock/service";
import { isWholeQuantity } from "@/lib/stock/quantity";
import type { CustomerOrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type OrderActionState = { success?: string; error?: string };

class OrderStockError extends Error {}

export async function createOrderAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const session = await requirePermission("order.create");
  const parsed = customerOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const item = await prisma.item.findFirst({
    where: { id: parsed.data.itemId, companyId: session.company.id, status: "ACTIVE" },
    include: { unit: true },
  });
  if (!item) return { error: "Item invalido ou inativo." };
  if (!item.unit.allowsFraction && !isWholeQuantity(parsed.data.quantity)) {
    return { error: "A unidade deste item nao permite quantidade fracionada." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.create({
        data: {
          companyId: session.company.id,
          customerName: parsed.data.customerName,
          documentNumber: parsed.data.documentNumber,
          createdByUserId: session.user.id,
        },
      });
      await tx.customerOrderItem.create({
        data: {
          companyId: session.company.id,
          orderId: order.id,
          itemId: item.id,
          quantity: parsed.data.quantity,
        },
      });

      const reservation = await reserveStockBalance(tx, {
        companyId: session.company.id,
        itemId: item.id,
        quantity: parsed.data.quantity,
      });
      if (!reservation.balance) {
        throw new OrderStockError(reservation.error ?? "Estoque disponivel insuficiente para reservar.");
      }

      await tx.stockMovement.create({
        data: {
          companyId: session.company.id,
          itemId: item.id,
          type: "ORDER_RESERVATION",
          quantity: parsed.data.quantity,
          balanceAfter: reservation.balance.quantityOnHand,
          documentNumber: parsed.data.documentNumber,
          note: "Reserva de pedido",
          sourceType: "customer_order",
          sourceId: order.id,
          createdByUserId: session.user.id,
          metadata: { orderId: order.id },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: session.company.id,
          userId: session.user.id,
          action: "order.created",
          entityType: "customer_order",
          entityId: order.id,
          metadata: parsed.data,
        },
      });
    });
  } catch (error) {
    if (error instanceof OrderStockError) return { error: error.message };
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pedidos");
  return { success: "Pedido criado." };
}

export async function changeOrderStatusAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed: readonly string[] = ["OPEN", "APPROVED", "IN_PRODUCTION", "READY", "SHIPPED", "CANCELED"];
  if (!allowed.includes(status)) return { error: "Status invalido." };
  const nextStatus = status as CustomerOrderStatus;

  const order = await prisma.customerOrder.findFirst({ where: { id, companyId: session.company.id } });
  if (!order) return { error: "Pedido nao encontrado." };
  if (!canChangeCustomerOrderStatus(order.status, nextStatus)) {
    return { error: invalidOrderStatusTransitionMessage(order.status, nextStatus) };
  }

  if (nextStatus === "SHIPPED") {
    if (!session.permissions.has("shipment.dispatch")) {
      return { error: "Voce nao tem permissao para expedir pedidos." };
    }

    const result = await dispatchCustomerOrder({
      companyId: session.company.id,
      userId: session.user.id,
      orderId: id,
    });
    if ("error" in result && result.error) return { error: result.error };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pedidos");
    revalidatePath("/dashboard/historico");
    return { success: "Pedido expedido e estoque baixado." };
  }

  if (!session.permissions.has("order.change_status")) {
    return { error: "Voce nao tem permissao para alterar status de pedidos." };
  }
  if (nextStatus === "APPROVED" && !session.permissions.has("order.approve")) {
    return { error: "Voce nao tem permissao para aprovar pedidos." };
  }
  if (nextStatus === "CANCELED" && !session.permissions.has("order.cancel")) {
    return { error: "Voce nao tem permissao para cancelar pedidos." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (nextStatus === "CANCELED") {
        const orderItems = await tx.customerOrderItem.findMany({
          where: { orderId: order.id, companyId: session.company.id, item: { companyId: session.company.id } },
        });

        for (const orderItem of orderItems) {
          const released = await releaseReservedStockBalance(tx, {
            companyId: session.company.id,
            itemId: orderItem.itemId,
            quantity: orderItem.quantity.toString(),
          });
          if (!released.balance) {
            throw new OrderStockError(released.error ?? "Nao foi possivel liberar a reserva do pedido.");
          }
        }
      }

      await tx.customerOrder.updateMany({
        where: { id: order.id, companyId: session.company.id },
        data: { status: nextStatus },
      });
      await tx.auditLog.create({
        data: {
          companyId: session.company.id,
          userId: session.user.id,
          action: "order.status.changed",
          entityType: "customer_order",
          entityId: order.id,
          metadata: { before: order.status, after: nextStatus },
        },
      });
    });
  } catch (error) {
    if (error instanceof OrderStockError) return { error: error.message };
    throw error;
  }

  revalidatePath("/dashboard/pedidos");
  return { success: "Status do pedido atualizado." };
}
