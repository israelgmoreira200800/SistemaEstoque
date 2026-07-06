import { z } from "zod";
import { nonNegativeQuantitySchema, quantitySchema } from "@/lib/stock/validation";

export const productComponentSchema = z.object({
  productId: z.string().min(1, "Selecione o produto."),
  componentItemId: z.string().min(1, "Selecione o componente."),
  quantity: quantitySchema,
});

const optionalText = z
  .string()
  .trim()
  .max(120)
  .transform((value) => value || undefined);

export const productionSchema = z
  .object({
    productId: z.string().min(1, "Selecione o produto."),
    quantity: quantitySchema,
    lossQuantity: nonNegativeQuantitySchema.optional(),
    lotNumber: optionalText.optional(),
    note: z
      .string()
      .trim()
      .max(240, "A observacao deve ter no maximo 240 caracteres.")
      .transform((value) => value || undefined)
      .optional(),
  })
  .strict();

