import { describe, expect, it } from "vitest";
import { createUserSchema, inviteUserSchema } from "./validation";

describe("user validation", () => {
  it("mantem criacao direta exigindo senha", () => {
    expect(
      createUserSchema.safeParse({
        name: "Pessoa Teste",
        email: "pessoa@exemplo.com",
        password: "SenhaSegura123",
      }).success,
    ).toBe(true);

    expect(
      createUserSchema.safeParse({
        name: "Pessoa Teste",
        email: "pessoa@exemplo.com",
      }).success,
    ).toBe(false);
  });

  it("permite convite sem senha inicial", () => {
    expect(
      inviteUserSchema.safeParse({
        name: "Pessoa Teste",
        email: "pessoa@exemplo.com",
      }).success,
    ).toBe(true);
  });
});
