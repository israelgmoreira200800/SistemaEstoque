import { prisma } from "@/lib/prisma";
import { isWholeQuantity, toNumber } from "@/lib/stock/quantity";
import type { StockMovementType } from "@/generated/prisma/enums";
import { Prisma, type StockBalance } from "@/generated/prisma/client";

type StockMovementInput = {
  companyId: string;
  userId: string;
  itemId: string;
  quantity: string;
  type: StockMovementType;
  documentNumber?: string;
  note?: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: Prisma.InputJsonValue;
};

export type StockBalanceDecreaseInput = {
  companyId: string;
  itemId: string;
  quantity: string;
};

async function findBalance(
  tx: Prisma.TransactionClient,
  input: { companyId: string; itemId: string },
) {
  return tx.stockBalance.findUnique({
    where: { companyId_itemId: { companyId: input.companyId, itemId: input.itemId } },
  });
}

export async function reserveStockBalance(
  tx: Prisma.TransactionClient,
  input: StockBalanceDecreaseInput,
) {
  const rows = await tx.$queryRaw<StockBalance[]>(Prisma.sql`
    UPDATE "stock_balances"
    SET
      "quantity_reserved" = "quantity_reserved" + ${input.quantity}::numeric,
      "updated_at" = NOW()
    WHERE "company_id" = ${input.companyId}
      AND "item_id" = ${input.itemId}
      AND ("quantity_on_hand" - "quantity_reserved" - "quantity_blocked") >= ${input.quantity}::numeric
    RETURNING *
  `);

  const balance = rows[0];
  if (!balance) return { error: "Estoque disponivel insuficiente para reservar." };
  return { balance };
}

export async function releaseReservedStockBalance(
  tx: Prisma.TransactionClient,
  input: StockBalanceDecreaseInput,
) {
  const updated = await tx.stockBalance.updateMany({
    where: {
      companyId: input.companyId,
      itemId: input.itemId,
      quantityReserved: { gte: input.quantity },
    },
    data: { quantityReserved: { decrement: input.quantity } },
  });

  if (updated.count !== 1) {
    return { error: "Reserva de estoque nao encontrada ou insuficiente." };
  }

  const balance = await findBalance(tx, input);
  if (!balance) return { error: "Saldo de estoque nao encontrado." };
  return { balance };
}

export async function shipReservedStockBalance(
  tx: Prisma.TransactionClient,
  input: StockBalanceDecreaseInput,
) {
  const updated = await tx.stockBalance.updateMany({
    where: {
      companyId: input.companyId,
      itemId: input.itemId,
      item: { companyId: input.companyId, status: "ACTIVE" },
      quantityOnHand: { gte: input.quantity },
      quantityReserved: { gte: input.quantity },
    },
    data: {
      quantityOnHand: { decrement: input.quantity },
      quantityReserved: { decrement: input.quantity },
    },
  });

  if (updated.count !== 1) {
    return { error: "Estoque reservado insuficiente para expedir o pedido." };
  }

  const balance = await findBalance(tx, input);
  if (!balance) return { error: "Saldo de estoque nao encontrado." };
  return { balance };
}

export async function decrementStockBalance(
  tx: Prisma.TransactionClient,
  input: StockBalanceDecreaseInput,
) {
  const updated = await tx.stockBalance.updateMany({
    where: {
      companyId: input.companyId,
      itemId: input.itemId,
      item: { companyId: input.companyId, status: "ACTIVE" },
      quantityOnHand: { gte: input.quantity },
    },
    data: { quantityOnHand: { decrement: input.quantity } },
  });

  if (updated.count !== 1) {
    return { error: "Estoque insuficiente para esta saida." };
  }

  const balance = await findBalance(tx, input);

  if (!balance) return { error: "Saldo de estoque nao encontrado." };

  return { balance };
}

export async function registerStockIncrease(input: StockMovementInput) {
  const item = await prisma.item.findFirst({
    where: { id: input.itemId, companyId: input.companyId, status: "ACTIVE" },
    include: { unit: true },
  });
  if (!item) return { error: "Item não encontrado ou inativo." };
  if (!item.unit.allowsFraction && !isWholeQuantity(input.quantity)) {
    return { error: "A unidade deste item não permite quantidade fracionada." };
  }

  const movement = await prisma.$transaction(async (tx) => {
    const balance = await tx.stockBalance.upsert({
      where: { companyId_itemId: { companyId: input.companyId, itemId: input.itemId } },
      update: { quantityOnHand: { increment: input.quantity } },
      create: {
        companyId: input.companyId,
        itemId: input.itemId,
        quantityOnHand: input.quantity,
      },
    });

    const created = await tx.stockMovement.create({
      data: {
        companyId: input.companyId,
        itemId: input.itemId,
        type: input.type,
        quantity: input.quantity,
        balanceAfter: balance.quantityOnHand,
        documentNumber: input.documentNumber,
        note: input.note,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdByUserId: input.userId,
        metadata: input.metadata,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: "stock.increased",
        entityType: "stock_movement",
        entityId: created.id,
        metadata: { itemId: input.itemId, quantity: input.quantity, type: input.type },
      },
    });

    return created;
  });

  return { movement };
}

export async function registerStockDecrease(input: StockMovementInput) {
  const item = await prisma.item.findFirst({
    where: { id: input.itemId, companyId: input.companyId, status: "ACTIVE" },
    include: { unit: true },
  });
  if (!item) return { error: "Item não encontrado ou inativo." };
  if (!item.unit.allowsFraction && !isWholeQuantity(input.quantity)) {
    return { error: "A unidade deste item não permite quantidade fracionada." };
  }

  const currentBalance = await prisma.stockBalance.findUnique({
    where: { companyId_itemId: { companyId: input.companyId, itemId: input.itemId } },
  });
  if (!currentBalance || toNumber(currentBalance.quantityOnHand) < toNumber(input.quantity)) {
    return { error: "Estoque insuficiente para esta saída." };
  }

  const movement = await prisma.$transaction(async (tx) => {
    const decrease = await decrementStockBalance(tx, {
      companyId: input.companyId,
      itemId: input.itemId,
      quantity: input.quantity,
    });
    const balance = decrease.balance;
    if (!balance) return { error: decrease.error };

    const created = await tx.stockMovement.create({
      data: {
        companyId: input.companyId,
        itemId: input.itemId,
        type: input.type,
        quantity: input.quantity,
        balanceAfter: balance.quantityOnHand,
        documentNumber: input.documentNumber,
        note: input.note,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdByUserId: input.userId,
        metadata: input.metadata,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: "stock.decreased",
        entityType: "stock_movement",
        entityId: created.id,
        metadata: { itemId: input.itemId, quantity: input.quantity, type: input.type },
      },
    });

    return { movement: created };
  });

  return movement;
}
