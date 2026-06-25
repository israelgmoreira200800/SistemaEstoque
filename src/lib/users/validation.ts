import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(180),
  password: z.string().min(12, "A senha precisa ter pelo menos 12 caracteres."),
  roleId: z.string().optional(),
  sectorId: z.string().optional(),
});

export const inviteUserSchema = createUserSchema.omit({ password: true });

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cargo.").max(120),
  description: z.string().trim().max(240).transform((value) => value || undefined),
});

export const createSectorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do setor.").max(120),
  description: z.string().trim().max(240).transform((value) => value || undefined),
});
