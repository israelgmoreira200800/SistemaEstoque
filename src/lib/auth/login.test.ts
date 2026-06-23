import { describe, expect, it } from "vitest";
import { loginSchema } from "./validation";

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
