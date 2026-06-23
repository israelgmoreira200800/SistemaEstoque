import { z } from "zod";

const requiredName = z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(120);

export const createUnitSchema = z.object({
  name: requiredName,
  symbol: z.string().trim().min(1, "Informe o símbolo.").max(12).transform((value) => value.toUpperCase()),
  allowsFraction: z.boolean(),
});

export const createCategorySchema = z.object({ name: requiredName });

export const itemTypes = [
  "RAW_MATERIAL",
  "PACKAGING",
  "COMPONENT",
  "INTERMEDIATE",
  "FINISHED_PRODUCT",
  "RESALE",
  "INTERNAL_CONSUMPTION",
] as const;

const optionalCode = z
  .string()
  .trim()
  .max(80)
  .transform((value) => value || undefined);

export const createItemSchema = z.object({
  name: requiredName,
  type: z.enum(itemTypes, { message: "Selecione um tipo válido." }),
  unitId: z.string().min(1, "Selecione a unidade."),
  categoryId: z.string().transform((value) => value || undefined),
  sku: optionalCode.transform((value) => value?.toUpperCase()),
  barcode: optionalCode,
  minimumStock: z
    .string()
    .trim()
    .transform((value) => value.replace(",", ".") || "0")
    .refine((value) => /^\d+(\.\d{1,6})?$/.test(value), "Informe uma quantidade válida."),
  description: z.string().trim().max(500).transform((value) => value || undefined),
});

export const updateUnitSchema = createUnitSchema.extend({
  id: z.string().min(1),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().min(1),
});

export const updateItemSchema = createItemSchema.extend({
  id: z.string().min(1),
});

export const unitConversionSchema = z.object({
  itemId: z.string().min(1),
  sourceUnitId: z.string().min(1, "Selecione a unidade alternativa."),
  factorToStockUnit: z
    .string()
    .trim()
    .transform((value) => value.replace(",", "."))
    .refine((value) => /^\d+(\.\d{1,6})?$/.test(value) && Number(value) > 0, "Informe um fator maior que zero."),
});
