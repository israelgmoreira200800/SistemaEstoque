"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { finishProductionFromBom } from "@/lib/production/service";
import { productionSchema } from "@/lib/production/validation";

export type ProductionActionState = { success?: string; error?: string };

export async function finishProductionAction(
  _state: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const session = await requirePermission("production.finish");
  const parsed = productionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const result = await finishProductionFromBom({
    companyId: session.company.id,
    userId: session.user.id,
    productId: parsed.data.productId,
    quantity: parsed.data.quantity,
    lossQuantity: parsed.data.lossQuantity,
    lotNumber: parsed.data.lotNumber,
    note: parsed.data.note,
  });
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/producao");
  revalidatePath("/dashboard/historico");
  return { success: "Producao registrada. Componentes baixados e produto acabado adicionado ao estoque." };
}
