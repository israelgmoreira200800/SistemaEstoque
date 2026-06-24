import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(180)
  .transform((value) => value || undefined);

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(z.string().email("Informe um e-mail valido.").optional());

const requiredEmail = z.string().trim().email("Informe um e-mail valido.");

const optionalInteger = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().int().min(1).max(365).optional(),
);

export const platformCompanySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(160),
  slug: z
    .string()
    .trim()
    .max(90)
    .transform((value) => value || undefined),
  legalName: optionalText,
  tradeName: optionalText,
  document: optionalText,
  email: optionalEmail,
  phone: optionalText,
  timezone: z.string().trim().min(1).max(80).default("America/Sao_Paulo"),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]).default("TRIAL"),
  planId: z.string().trim().min(1, "Selecione um plano inicial."),
  trialDays: optionalInteger,
  adminName: z.string().trim().min(2, "Informe o nome do administrador.").max(160),
  adminEmail: requiredEmail,
  adminPassword: z.string().min(12, "A senha inicial deve ter pelo menos 12 caracteres."),
});

export const platformCompanyStatusSchema = z.object({
  companyId: z.string().min(1),
  operation: z.enum(["activate", "suspend", "reactivate", "cancel"]),
  reason: z.string().trim().max(240).transform((value) => value || undefined),
});
