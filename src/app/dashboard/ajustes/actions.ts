"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireSession } from "@/lib/auth/session";
import {
  stockAdjustmentRequestSchema,
  stockAdjustmentReviewSchema,
} from "@/lib/stock/validation";
import {
  approveStockAdjustmentRequest,
  createStockAdjustmentRequest,
  rejectStockAdjustmentRequest,
} from "@/lib/stock/adjustments";

export type AdjustmentActionState = { success?: string; error?: string };

function revalidateStockAdjustmentPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/historico");
}

export async function createAdjustmentRequestAction(
  _state: AdjustmentActionState,
  formData: FormData,
): Promise<AdjustmentActionState> {
  const session = await requireSession();
  const parsed = stockAdjustmentRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const requiredPermission = parsed.data.kind === "ADJUSTMENT" ? "stock.adjust" : "stock.inventory";
  if (!session.permissions.has(requiredPermission)) {
    return { error: "Voce nao tem permissao para este tipo de solicitacao." };
  }

  const result = await createStockAdjustmentRequest({
    companyId: session.company.id,
    userId: session.user.id,
    itemId: parsed.data.itemId,
    kind: parsed.data.kind,
    requestedQuantity: parsed.data.requestedQuantity,
    documentNumber: parsed.data.documentNumber,
    reason: parsed.data.reason,
  });

  if ("error" in result && result.error) return { error: result.error };

  revalidateStockAdjustmentPaths();
  return { success: "Solicitacao criada para aprovacao." };
}

export async function approveAdjustmentRequestAction(
  _state: AdjustmentActionState,
  formData: FormData,
): Promise<AdjustmentActionState> {
  const session = await requirePermission("stock.adjust_approve");
  const parsed = stockAdjustmentReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const result = await approveStockAdjustmentRequest({
    companyId: session.company.id,
    userId: session.user.id,
    requestId: parsed.data.id,
    reviewNote: parsed.data.reviewNote,
  });

  if ("error" in result && result.error) return { error: result.error };

  revalidateStockAdjustmentPaths();
  return { success: "Solicitacao aprovada e saldo atualizado." };
}

export async function rejectAdjustmentRequestAction(
  _state: AdjustmentActionState,
  formData: FormData,
): Promise<AdjustmentActionState> {
  const session = await requirePermission("stock.adjust_approve");
  const parsed = stockAdjustmentReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const result = await rejectStockAdjustmentRequest({
    companyId: session.company.id,
    userId: session.user.id,
    requestId: parsed.data.id,
    reviewNote: parsed.data.reviewNote,
  });

  if ("error" in result && result.error) return { error: result.error };

  revalidateStockAdjustmentPaths();
  return { success: "Solicitacao rejeitada." };
}
