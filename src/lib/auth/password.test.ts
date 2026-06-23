import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, verifyPassword } from "./password";

describe("password", () => {
  it("gera hashes diferentes e valida somente a senha correta", async () => {
    const first = await hashPassword("uma-senha-segura");
    const second = await hashPassword("uma-senha-segura");

    expect(first).not.toBe(second);
    await expect(verifyPassword("uma-senha-segura", first)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", first)).resolves.toBe(false);
  });

  it("rejeita hashes inválidos sem lançar erro", async () => {
    await expect(verifyPassword("senha", "inválido")).resolves.toBe(false);
  });

  it("normaliza e-mail para autenticação", () => {
    expect(normalizeEmail("  Pessoa@EXEMPLO.COM ")).toBe("pessoa@exemplo.com");
  });
});

