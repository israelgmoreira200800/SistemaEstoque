"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { stockEntrySchema } from "@/lib/stock/validation";
import { registerStockIncrease } from "@/lib/stock/service";

export type StockActionState = { success?: string; error?: string };

export async function createEntryAction(
  _state: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const session = await requirePermission("stock.entry");
  const parsed = stockEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const result = await registerStockIncrease({
    companyId: session.company.id,
    userId: session.user.id,
    itemId: parsed.data.itemId,
    quantity: parsed.data.quantity,
    type: "ENTRY",
    documentNumber: parsed.data.documentNumber,
    note: parsed.data.note,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/entradas");
  revalidatePath("/dashboard/historico");
  return { success: "Entrada registrada e estoque atualizado." };
}

