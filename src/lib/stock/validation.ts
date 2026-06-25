import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(120)
  .transform((value) => value || undefined);

export const quantitySchema = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => /^\d+(\.\d{1,6})?$/.test(value), "Informe uma quantidade válida.")
  .refine((value) => Number(value) > 0, "A quantidade precisa ser maior que zero.");

export const nonNegativeQuantitySchema = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => /^\d+(\.\d{1,6})?$/.test(value), "Informe uma quantidade valida.")
  .refine((value) => Number(value) >= 0, "A quantidade nao pode ser negativa.");

export const stockEntrySchema = z.object({
  itemId: z.string().min(1, "Selecione um item."),
  quantity: quantitySchema,
  documentNumber: optionalText,
  note: optionalText,
});

export const stockExitSchema = z.object({
  itemId: z.string().min(1, "Selecione um item."),
  quantity: quantitySchema,
  documentNumber: optionalText,
  note: optionalText,
});

export const stockAdjustmentRequestSchema = z.object({
  itemId: z.string().min(1, "Selecione um item."),
  kind: z.enum(["ADJUSTMENT", "INVENTORY"], "Selecione o tipo de solicitacao."),
  requestedQuantity: nonNegativeQuantitySchema,
  documentNumber: optionalText,
  reason: z
    .string()
    .trim()
    .min(3, "Informe o motivo da solicitacao.")
    .max(240, "O motivo deve ter no maximo 240 caracteres."),
});

export const stockAdjustmentReviewSchema = z.object({
  id: z.string().min(1, "Solicitacao invalida."),
  reviewNote: z
    .string()
    .trim()
    .max(240, "A observacao deve ter no maximo 240 caracteres.")
    .transform((value) => value || undefined),
});
