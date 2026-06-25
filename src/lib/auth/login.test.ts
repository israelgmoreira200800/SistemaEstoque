import { describe, expect, it } from "vitest";
import { acceptInviteSchema, loginSchema, requestPasswordResetSchema, resetPasswordSchema } from "./validation";

describe("loginSchema", () => {
  it("valida credenciais bem formadas", () => {
    expect(loginSchema.safeParse({ email: "admin@exemplo.com", password: "senha" }).success).toBe(
      true,
    );
  });

  it("rejeita e-mail inválido e senha vazia", () => {
    expect(loginSchema.safeParse({ email: "admin", password: "" }).success).toBe(false);
  });
});

describe("account recovery schemas", () => {
  it("valida pedido de recuperacao por e-mail", () => {
    expect(requestPasswordResetSchema.safeParse({ email: "admin@exemplo.com" }).success).toBe(true);
    expect(requestPasswordResetSchema.safeParse({ email: "admin" }).success).toBe(false);
  });

  it("exige token e confirmacao de senha na redefinicao", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "token-com-tamanho-suficiente",
        password: "SenhaSegura123",
        confirmPassword: "SenhaSegura123",
      }).success,
    ).toBe(true);

    expect(
      resetPasswordSchema.safeParse({
        token: "token-com-tamanho-suficiente",
        password: "SenhaSegura123",
        confirmPassword: "outra-senha",
      }).success,
    ).toBe(false);
  });

  it("usa a mesma regra de senha para aceite de convite", () => {
    expect(
      acceptInviteSchema.safeParse({
        token: "token-com-tamanho-suficiente",
        password: "SenhaSegura123",
        confirmPassword: "SenhaSegura123",
      }).success,
    ).toBe(true);
  });
});
