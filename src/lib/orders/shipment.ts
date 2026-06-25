import { prisma } from "@/lib/prisma";
import { decrementStockBalance } from "@/lib/stock/service";
import type { CustomerOrderStatus } from "@/generated/prisma/enums";

type DispatchCustomerOrderInput = {
  companyId: string;
  userId: string;
  orderId: string;
};

class ShipmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShipmentError";
  }
}

function shipmentError(message: string): never {
  throw new ShipmentError(message);
}

export function canDispatchCustomerOrder(status: CustomerOrderStatus) {
  return status !== "CANCELED" && status !== "SHIPPED";
}

export async function dispatchCustomerOrder(input: DispatchCustomerOrderInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findFirst({
        where: { id: input.orderId, companyId: input.companyId },
        include: {
          items: {
            where: { companyId: input.companyId, item: { companyId: input.companyId } },
            include: { item: true },
          },
        },
      });

      if (!order) shipmentError("Pedido nao encontrado.");
      if (!canDispatchCustomerOrder(order.status)) {
        shipmentError("Pedido cancelado ou ja expedido nao pode ser expedido novamente.");
      }
      if (order.items.length === 0) shipmentError("Pedido sem itens para expedicao.");

      const movements: string[] = [];
      for (const orderItem of order.items) {
        if (orderItem.item.status !== "ACTIVE") {
          shipmentError("Pedido possui item inativo.");
        }

        const decrease = await decrementStockBalance(tx, {
          companyId: input.companyId,
          itemId: orderItem.itemId,
          quantity: orderItem.quantity.toString(),
        });
        if (!decrease.balance) {
          shipmentError(decrease.error ?? "Estoque insuficiente para expedir o pedido.");
        }

        const movement = await tx.stockMovement.create({
          data: {
            companyId: input.companyId,
            itemId: orderItem.itemId,
            type: "SHIPMENT",
            quantity: orderItem.quantity,
            balanceAfter: decrease.balance.quantityOnHand,
            documentNumber: order.documentNumber,
            note: "Expedicao de pedido",
            sourceType: "customer_order",
            sourceId: order.id,
            createdByUserId: input.userId,
            metadata: {
              orderId: order.id,
              orderItemId: orderItem.id,
              customerName: order.customerName,
            },
          },
        });
        movements.push(movement.id);
      }

      const updated = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: "SHIPPED" },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          action: "order.shipped",
          entityType: "customer_order",
          entityId: order.id,
          metadata: {
            before: order.status,
            after: "SHIPPED",
            movementIds: movements,
            itemCount: order.items.length,
          },
        },
      });

      return { order: updated, movementIds: movements };
    });

    return result;
  } catch (error) {
    if (error instanceof ShipmentError) {
      return { error: error.message };
    }
    throw error;
  }
}
