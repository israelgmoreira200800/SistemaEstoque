import { prisma } from "@/lib/prisma";
import { availableQuantity, isWholeQuantity, multiplyQuantity, toNumber } from "@/lib/stock/quantity";
import { decrementAvailableStockBalance } from "@/lib/stock/service";

type ProductionOperationalInput = {
  companyId: string;
  userId: string;
  productId: string;
  quantity: string;
  lossQuantity?: string;
  lotNumber?: string;
  note?: string;
};

type ProductionClient = typeof prisma;

class ProductionBomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionBomError";
  }
}

function productionError(message: string): never {
  throw new ProductionBomError(message);
}

export function calculateProductionRequirement(componentQuantity: string, productionQuantity: string) {
  return multiplyQuantity(componentQuantity, productionQuantity);
}

export async function finishProductionFromBom(
  input: ProductionOperationalInput,
  client: ProductionClient = prisma,
) {
  try {
    const product = await client.item.findFirst({
      where: { id: input.productId, companyId: input.companyId, status: "ACTIVE" },
      include: { unit: true },
    });
    if (!product) return { error: "Produto nao encontrado ou inativo." };
    if (!product.unit.allowsFraction && !isWholeQuantity(input.quantity)) {
      return { error: "A unidade do produto nao permite quantidade fracionada." };
    }

    const components = await client.productComponent.findMany({
      where: {
        companyId: input.companyId,
        productId: product.id,
        status: "ACTIVE",
        product: { companyId: input.companyId, status: "ACTIVE" },
        componentItem: { companyId: input.companyId, status: "ACTIVE" },
      },
      include: {
        componentItem: { include: { unit: true, stockBalance: true } },
      },
    });

    if (components.length === 0) {
      return { error: "Produto sem ficha tecnica ativa." };
    }

    for (const component of components) {
      const required = calculateProductionRequirement(component.quantity.toString(), input.quantity);
      const available = availableQuantity(component.componentItem.stockBalance);
      if (available < toNumber(required)) {
        return {
          error: `Estoque insuficiente de ${component.componentItem.name}. Necessario: ${required} ${component.componentItem.unit.symbol}; disponivel: ${available}.`,
        };
      }
    }

    await client.$transaction(async (tx) => {
      const activeProduct = await tx.item.findFirst({
        where: { id: product.id, companyId: input.companyId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!activeProduct) productionError("Produto nao encontrado ou inativo.");

      const activeComponents = await tx.productComponent.findMany({
        where: {
          companyId: input.companyId,
          productId: product.id,
          status: "ACTIVE",
          product: { companyId: input.companyId, status: "ACTIVE" },
          componentItem: { companyId: input.companyId, status: "ACTIVE" },
        },
        include: { componentItem: { include: { unit: true } } },
      });
      if (activeComponents.length === 0) productionError("Produto sem ficha tecnica ativa.");

      const production = await tx.production.create({
        data: {
          companyId: input.companyId,
          productId: product.id,
          quantity: input.quantity,
          createdByUserId: input.userId,
        },
      });

      for (const component of activeComponents) {
        const required = calculateProductionRequirement(component.quantity.toString(), input.quantity);
        const decrease = await decrementAvailableStockBalance(tx, {
          companyId: input.companyId,
          itemId: component.componentItemId,
          quantity: required,
        });
        const balance = decrease.balance;
        if (!balance) {
          productionError(
            `Estoque insuficiente de ${component.componentItem.name}. Necessario: ${required} ${component.componentItem.unit.symbol}.`,
          );
        }

        await tx.stockMovement.create({
          data: {
            companyId: input.companyId,
            itemId: component.componentItemId,
            type: "PRODUCTION_CONSUMPTION",
            quantity: required,
            balanceAfter: balance.quantityOnHand,
            sourceType: "production",
            sourceId: production.id,
            createdByUserId: input.userId,
            metadata: { productId: product.id, productQuantity: input.quantity },
          },
        });
      }

      const productBalance = await tx.stockBalance.upsert({
        where: { companyId_itemId: { companyId: input.companyId, itemId: product.id } },
        update: { quantityOnHand: { increment: input.quantity } },
        create: {
          companyId: input.companyId,
          itemId: product.id,
          quantityOnHand: input.quantity,
        },
      });
      await tx.stockMovement.create({
        data: {
          companyId: input.companyId,
          itemId: product.id,
          type: "PRODUCTION_OUTPUT",
          quantity: input.quantity,
          balanceAfter: productBalance.quantityOnHand,
          sourceType: "production",
          sourceId: production.id,
          createdByUserId: input.userId,
          metadata: {
            lossQuantity: input.lossQuantity,
            lotNumber: input.lotNumber,
            note: input.note,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          action: "production.finished",
          entityType: "production",
          entityId: production.id,
          metadata: {
            productId: product.id,
            quantity: input.quantity,
            lossQuantity: input.lossQuantity,
            lotNumber: input.lotNumber,
            note: input.note,
          },
        },
      });
    });

    return { success: true as const };
  } catch (error) {
    if (error instanceof ProductionBomError) return { error: error.message };
    throw error;
  }
}
