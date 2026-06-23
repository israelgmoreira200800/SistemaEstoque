"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { stockExitSchema } from "@/lib/stock/validation";
import { registerStockDecrease } from "@/lib/stock/service";

export type StockActionState = { success?: string; error?: string };

export async function createExitAction(
  _state: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const session = await requirePermission("stock.exit");
  const parsed = stockExitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const result = await registerStockDecrease({
    companyId: session.company.id,
    userId: session.user.id,
    itemId: parsed.data.itemId,
    quantity: parsed.data.quantity,
    type: "EXIT",
    documentNumber: parsed.data.documentNumber,
    note: parsed.data.note,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/saidas");
  revalidatePath("/dashboard/historico");
  return { success: "Saída registrada e estoque atualizado." };
}

