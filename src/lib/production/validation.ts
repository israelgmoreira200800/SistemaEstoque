import { z } from "zod";
import { quantitySchema } from "@/lib/stock/validation";

export const productComponentSchema = z.object({
  productId: z.string().min(1, "Selecione o produto."),
  componentItemId: z.string().min(1, "Selecione o componente."),
  quantity: quantitySchema,
});

export const productionSchema = z.object({
  productId: z.string().min(1, "Selecione o produto."),
  quantity: quantitySchema,
});

