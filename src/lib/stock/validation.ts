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

