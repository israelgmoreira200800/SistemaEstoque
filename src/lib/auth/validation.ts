import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha.").max(200),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido.").max(180),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20, "Token invalido."),
    password: z.string().min(12, "A senha precisa ter pelo menos 12 caracteres.").max(200),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem.",
    path: ["confirmPassword"],
  });

export const acceptInviteSchema = resetPasswordSchema;
