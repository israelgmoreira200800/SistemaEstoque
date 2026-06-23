import { z } from "zod";
import { quantitySchema } from "@/lib/stock/validation";

const optionalText = z
  .string()
  .trim()
  .max(120)
  .transform((value) => value || undefined);

export const customerOrderSchema = z.object({
  customerName: optionalText,
  documentNumber: optionalText,
  itemId: z.string().min(1, "Selecione um item."),
  quantity: quantitySchema,
});

