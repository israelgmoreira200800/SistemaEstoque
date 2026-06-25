"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { productComponentSchema, productionSchema } from "@/lib/production/validation";
import { decrementStockBalance } from "@/lib/stock/service";
import { isWholeQuantity, multiplyQuantity, toNumber } from "@/lib/stock/quantity";
import { prisma } from "@/lib/prisma";

export type ProductionActionState = { success?: string; error?: string };

class ProductionStockError extends Error {}

export async function saveComponentAction(
  _state: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const session = await requirePermission("recipe.update");
  const parsed = productComponentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (parsed.data.productId === parsed.data.componentItemId) {
    return { error: "O produto não pode ser componente dele mesmo." };
  }

  const [product, component] = await Promise.all([
    prisma.item.findFirst({ where: { id: parsed.data.productId, companyId: session.company.id, status: "ACTIVE" } }),
    prisma.item.findFirst({
      where: { id: parsed.data.componentItemId, companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true },
    }),
  ]);

  if (!product || !component) return { error: "Produto ou componente inválido." };
  if (!component.unit.allowsFraction && !isWholeQuantity(parsed.data.quantity)) {
    return { error: "A unidade do componente não permite quantidade fracionada." };
  }

  await prisma.$transaction(async (tx) => {
    const componentRecord = await tx.productComponent.upsert({
      where: {
        companyId_productId_componentItemId: {
          companyId: session.company.id,
          productId: parsed.data.productId,
          componentItemId: parsed.data.componentItemId,
        },
      },
      update: { quantity: parsed.data.quantity, status: "ACTIVE" },
      create: { companyId: session.company.id, ...parsed.data },
    });
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "recipe.component.saved",
        entityType: "product_component",
        entityId: componentRecord.id,
        metadata: parsed.data,
      },
    });
  });

  revalidatePath("/dashboard/producao");
  return { success: "Componente salvo na ficha técnica." };
}

export async function inactivateComponentAction(
  _state: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const session = await requirePermission("recipe.inactivate");
  const id = String(formData.get("id") ?? "");
  const component = await prisma.productComponent.findFirst({ where: { id, companyId: session.company.id } });
  if (!component) return { error: "Componente não encontrado." };

  await prisma.$transaction([
    prisma.productComponent.updateMany({ where: { id: component.id, companyId: session.company.id }, data: { status: "INACTIVE" } }),
    prisma.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "recipe.component.inactivated",
        entityType: "product_component",
        entityId: component.id,
      },
    }),
  ]);

  revalidatePath("/dashboard/producao");
  return { success: "Componente removido da ficha técnica." };
}

export async function finishProductionAction(
  _state: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const session = await requirePermission("production.finish");
  const parsed = productionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const product = await prisma.item.findFirst({
    where: { id: parsed.data.productId, companyId: session.company.id, status: "ACTIVE" },
    include: { unit: true },
  });
  if (!product) return { error: "Produto não encontrado ou inativo." };
  if (!product.unit.allowsFraction && !isWholeQuantity(parsed.data.quantity)) {
    return { error: "A unidade do produto não permite quantidade fracionada." };
  }

  const components = await prisma.productComponent.findMany({
    where: {
      companyId: session.company.id,
      productId: product.id,
      status: "ACTIVE",
      product: { companyId: session.company.id },
      componentItem: { companyId: session.company.id },
    },
    include: {
      componentItem: { include: { unit: true, stockBalance: true } },
    },
  });
  if (components.length === 0) return { error: "Cadastre a ficha técnica antes de produzir." };

  for (const component of components) {
    const required = multiplyQuantity(component.quantity.toString(), parsed.data.quantity);
    const current = toNumber(component.componentItem.stockBalance?.quantityOnHand ?? 0);
    if (current < toNumber(required)) {
      return {
        error: `Estoque insuficiente de ${component.componentItem.name}. Necessário: ${required} ${component.componentItem.unit.symbol}.`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const activeProduct = await tx.item.findFirst({
        where: { id: product.id, companyId: session.company.id, status: "ACTIVE" },
        select: { id: true },
      });
      if (!activeProduct) throw new ProductionStockError("Produto nao encontrado ou inativo.");

      const activeComponents = await tx.productComponent.findMany({
        where: {
          companyId: session.company.id,
          productId: product.id,
          status: "ACTIVE",
          product: { companyId: session.company.id, status: "ACTIVE" },
          componentItem: { companyId: session.company.id, status: "ACTIVE" },
        },
        include: { componentItem: { include: { unit: true } } },
      });
      if (activeComponents.length === 0) {
        throw new ProductionStockError("Cadastre a ficha tecnica antes de produzir.");
      }

      const production = await tx.production.create({
        data: {
          companyId: session.company.id,
          productId: product.id,
          quantity: parsed.data.quantity,
          createdByUserId: session.user.id,
        },
      });

      for (const component of activeComponents) {
        const required = multiplyQuantity(component.quantity.toString(), parsed.data.quantity);
        const decrease = await decrementStockBalance(tx, {
          companyId: session.company.id,
          itemId: component.componentItemId,
          quantity: required,
        });
        const balance = decrease.balance;
        if (!balance) {
          throw new ProductionStockError(
            `Estoque insuficiente de ${component.componentItem.name}. Necessario: ${required} ${component.componentItem.unit.symbol}.`,
          );
        }

        await tx.stockMovement.create({
          data: {
            companyId: session.company.id,
            itemId: component.componentItemId,
            type: "PRODUCTION_CONSUMPTION",
            quantity: required,
            balanceAfter: balance.quantityOnHand,
            sourceType: "production",
            sourceId: production.id,
            createdByUserId: session.user.id,
            metadata: { productId: product.id, productQuantity: parsed.data.quantity },
          },
        });
      }

      const productBalance = await tx.stockBalance.upsert({
        where: { companyId_itemId: { companyId: session.company.id, itemId: product.id } },
        update: { quantityOnHand: { increment: parsed.data.quantity } },
        create: {
          companyId: session.company.id,
          itemId: product.id,
          quantityOnHand: parsed.data.quantity,
        },
      });
      await tx.stockMovement.create({
        data: {
          companyId: session.company.id,
          itemId: product.id,
          type: "PRODUCTION_OUTPUT",
          quantity: parsed.data.quantity,
          balanceAfter: productBalance.quantityOnHand,
          sourceType: "production",
          sourceId: production.id,
          createdByUserId: session.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: session.company.id,
          userId: session.user.id,
          action: "production.finished",
          entityType: "production",
          entityId: production.id,
          metadata: { productId: product.id, quantity: parsed.data.quantity },
        },
      });
    });
  } catch (error) {
    if (error instanceof ProductionStockError) return { error: error.message };
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/producao");
  revalidatePath("/dashboard/historico");
  return { success: "Produção registrada. Componentes baixados e produto acabado adicionado ao estoque." };
}
