import { prisma } from "@/lib/prisma";
import { isWholeQuantity, toNumber, toQuantityString } from "@/lib/stock/quantity";
import { decrementStockBalance } from "@/lib/stock/service";
import type { StockAdjustmentKind } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

type CreateStockAdjustmentRequestInput = {
  companyId: string;
  userId: string;
  itemId: string;
  kind: StockAdjustmentKind;
  requestedQuantity: string;
  documentNumber?: string;
  reason: string;
};

type ReviewStockAdjustmentRequestInput = {
  companyId: string;
  userId: string;
  requestId: string;
  reviewNote?: string;
};

class StockAdjustmentReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockAdjustmentReviewError";
  }
}

function reviewError(message: string): never {
  throw new StockAdjustmentReviewError(message);
}

export function calculateStockAdjustmentDelta(input: {
  currentQuantity: unknown;
  requestedQuantity: unknown;
}) {
  const currentQuantity = toNumber(input.currentQuantity);
  const requestedQuantity = toNumber(input.requestedQuantity);
  const normalizedDelta = toNumber(toQuantityString(requestedQuantity - currentQuantity));

  return {
    currentQuantity: toQuantityString(currentQuantity),
    requestedQuantity: toQuantityString(requestedQuantity),
    delta: toQuantityString(normalizedDelta),
    absoluteDelta: toQuantityString(Math.abs(normalizedDelta)),
    direction: normalizedDelta > 0 ? "INCREASE" : normalizedDelta < 0 ? "DECREASE" : "NONE",
    isNoop: normalizedDelta === 0,
  } as const;
}

function movementTypeForKind(kind: StockAdjustmentKind) {
  return kind;
}

async function increaseStockBalance(
  tx: Prisma.TransactionClient,
  input: { companyId: string; itemId: string; quantity: string },
) {
  return tx.stockBalance.upsert({
    where: { companyId_itemId: { companyId: input.companyId, itemId: input.itemId } },
    update: { quantityOnHand: { increment: input.quantity } },
    create: {
      companyId: input.companyId,
      itemId: input.itemId,
      quantityOnHand: input.quantity,
    },
  });
}

export async function createStockAdjustmentRequest(input: CreateStockAdjustmentRequestInput) {
  const item = await prisma.item.findFirst({
    where: { id: input.itemId, companyId: input.companyId, status: "ACTIVE" },
    include: { unit: true, stockBalance: true },
  });
  if (!item) return { error: "Item nao encontrado ou inativo." };
  if (!item.unit.allowsFraction && !isWholeQuantity(input.requestedQuantity)) {
    return { error: "A unidade deste item nao permite quantidade fracionada." };
  }

  const pending = await prisma.stockAdjustmentRequest.findFirst({
    where: {
      companyId: input.companyId,
      itemId: input.itemId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (pending) return { error: "Ja existe uma solicitacao pendente para este item." };

  const currentQuantity = item.stockBalance?.quantityOnHand ?? "0";
  const delta = calculateStockAdjustmentDelta({
    currentQuantity,
    requestedQuantity: input.requestedQuantity,
  });

  if (delta.isNoop) {
    return { error: "O saldo solicitado precisa ser diferente do saldo atual." };
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.stockAdjustmentRequest.create({
      data: {
        companyId: input.companyId,
        itemId: input.itemId,
        kind: input.kind,
        currentQuantity: delta.currentQuantity,
        requestedQuantity: delta.requestedQuantity,
        documentNumber: input.documentNumber,
        reason: input.reason,
        requestedByUserId: input.userId,
        metadata: {
          initialDelta: delta.delta,
          initialDirection: delta.direction,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: "stock.adjustment.requested",
        entityType: "stock_adjustment_request",
        entityId: created.id,
        metadata: {
          itemId: input.itemId,
          kind: input.kind,
          currentQuantity: delta.currentQuantity,
          requestedQuantity: delta.requestedQuantity,
          initialDelta: delta.delta,
        },
      },
    });

    return created;
  });

  return { request };
}

export async function approveStockAdjustmentRequest(input: ReviewStockAdjustmentRequestInput) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.stockAdjustmentRequest.updateMany({
        where: {
          id: input.requestId,
          companyId: input.companyId,
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          reviewedByUserId: input.userId,
          reviewedAt: now,
          reviewNote: input.reviewNote,
        },
      });

      if (claimed.count !== 1) {
        reviewError("Solicitacao nao encontrada ou ja revisada.");
      }

      const request = await tx.stockAdjustmentRequest.findUnique({
        where: { id: input.requestId },
        include: { item: { include: { unit: true } } },
      });
      if (!request || request.companyId !== input.companyId) {
        reviewError("Solicitacao nao encontrada.");
      }
      if (request.item.status !== "ACTIVE" || request.item.companyId !== input.companyId) {
        reviewError("Item nao encontrado ou inativo.");
      }
      if (!request.item.unit.allowsFraction && !isWholeQuantity(request.requestedQuantity.toString())) {
        reviewError("A unidade deste item nao permite quantidade fracionada.");
      }

      const balance = await tx.stockBalance.findUnique({
        where: { companyId_itemId: { companyId: input.companyId, itemId: request.itemId } },
      });
      const delta = calculateStockAdjustmentDelta({
        currentQuantity: balance?.quantityOnHand ?? "0",
        requestedQuantity: request.requestedQuantity,
      });

      let movementId: string | undefined;
      if (!delta.isNoop) {
        const nextBalance =
          delta.direction === "INCREASE"
            ? await increaseStockBalance(tx, {
                companyId: input.companyId,
                itemId: request.itemId,
                quantity: delta.absoluteDelta,
              })
            : (await decrementStockBalance(tx, {
                companyId: input.companyId,
                itemId: request.itemId,
                quantity: delta.absoluteDelta,
              })).balance;

        if (!nextBalance) reviewError("Estoque insuficiente para aplicar a solicitacao.");

        const movement = await tx.stockMovement.create({
          data: {
            companyId: input.companyId,
            itemId: request.itemId,
            type: movementTypeForKind(request.kind),
            quantity: delta.absoluteDelta,
            balanceAfter: nextBalance.quantityOnHand,
            documentNumber: request.documentNumber,
            note: request.reason,
            sourceType: "stock_adjustment_request",
            sourceId: request.id,
            createdByUserId: input.userId,
            metadata: {
              requestId: request.id,
              requestedByUserId: request.requestedByUserId,
              reviewedByUserId: input.userId,
              requestedQuantity: delta.requestedQuantity,
              currentAtApproval: delta.currentQuantity,
              appliedDelta: delta.delta,
              direction: delta.direction,
            },
          },
        });
        movementId = movement.id;
      }

      const reviewed = await tx.stockAdjustmentRequest.update({
        where: { id: request.id },
        data: {
          appliedDelta: delta.delta,
          movementId,
          metadata: {
            ...(typeof request.metadata === "object" && request.metadata && !Array.isArray(request.metadata)
              ? request.metadata
              : {}),
            currentAtApproval: delta.currentQuantity,
            appliedDelta: delta.delta,
            direction: delta.direction,
            movementCreated: Boolean(movementId),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: input.companyId,
          userId: input.userId,
          action: "stock.adjustment.approved",
          entityType: "stock_adjustment_request",
          entityId: reviewed.id,
          metadata: {
            itemId: reviewed.itemId,
            kind: reviewed.kind,
            movementId,
            requestedQuantity: delta.requestedQuantity,
            currentAtApproval: delta.currentQuantity,
            appliedDelta: delta.delta,
          },
        },
      });

      return { request: reviewed };
    });

    return result;
  } catch (error) {
    if (error instanceof StockAdjustmentReviewError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function rejectStockAdjustmentRequest(input: ReviewStockAdjustmentRequestInput) {
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.stockAdjustmentRequest.updateMany({
      where: {
        id: input.requestId,
        companyId: input.companyId,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        reviewedByUserId: input.userId,
        reviewedAt: now,
        reviewNote: input.reviewNote,
      },
    });

    if (updated.count !== 1) {
      return { error: "Solicitacao nao encontrada ou ja revisada." };
    }

    const request = await tx.stockAdjustmentRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) return { error: "Solicitacao nao encontrada." };

    await tx.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: "stock.adjustment.rejected",
        entityType: "stock_adjustment_request",
        entityId: request.id,
        metadata: {
          itemId: request.itemId,
          kind: request.kind,
          requestedQuantity: request.requestedQuantity.toString(),
          reviewNote: input.reviewNote,
        },
      },
    });

    return { request };
  });

  return result;
}
