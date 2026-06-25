"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireSession } from "@/lib/auth/session";
import { customerOrderSchema } from "@/lib/orders/validation";
import { dispatchCustomerOrder } from "@/lib/orders/shipment";
import { isWholeQuantity } from "@/lib/stock/quantity";
import { prisma } from "@/lib/prisma";

export type OrderActionState = { success?: string; error?: string };

export async function createOrderAction(
  _state: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const session = await requirePermission("order.create");
  const parsed = customerOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const item = await prisma.item.findFirst({
    where: { id: parsed.data.itemId, companyId: session.company.id, status: "ACTIVE" },
    include: { unit: true },
  });
  if (!item) return { error: "Item inválido ou inativo." };
  if (!item.unit.allowsFraction && !isWholeQuantity(parsed.data.quantity)) {
    return { error: "A unidade deste item não permite quantidade fracionada." };
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.create({
      data: {
        companyId: session.company.id,
        customerName: parsed.data.customerName,
        documentNumber: parsed.data.documentNumber,
        createdByUserId: session.user.id,
        items: {
          create: {
            companyId: session.company.id,
            itemId: item.id,
            quantity: parsed.data.quantity,
          },
        },
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
  const allowed = ["OPEN", "APPROVED", "IN_PRODUCTION", "READY", "SHIPPED", "CANCELED"];
  if (!allowed.includes(status)) return { error: "Status inválido." };
  if (status === "SHIPPED") {
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
  if (status === "APPROVED" && !session.permissions.has("order.approve")) {
    return { error: "Você não tem permissão para aprovar pedidos." };
  }
  if (status === "CANCELED" && !session.permissions.has("order.cancel")) {
    return { error: "Você não tem permissão para cancelar pedidos." };
  }

  const order = await prisma.customerOrder.findFirst({ where: { id, companyId: session.company.id } });
  if (!order) return { error: "Pedido não encontrado." };

  await prisma.$transaction([
    prisma.customerOrder.updateMany({ where: { id: order.id, companyId: session.company.id }, data: { status: status as never } }),
    prisma.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "order.status.changed",
        entityType: "customer_order",
        entityId: order.id,
        metadata: { before: order.status, after: status },
      },
    }),
  ]);

  revalidatePath("/dashboard/pedidos");
  return { success: "Status do pedido atualizado." };
}
