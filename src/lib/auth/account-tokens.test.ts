import { describe, expect, it } from "vitest";
import { addMinutes, addTokenDays, createAccountToken, hashAccountToken, isExpired } from "./account-tokens";

describe("account tokens", () => {
  it("gera token opaco e armazena apenas hash sha256", () => {
    const first = createAccountToken();
    const second = createAccountToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashAccountToken(first.token));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("calcula expiracao de minutos e dias", () => {
    const now = new Date("2026-06-24T12:00:00.000Z");

    expect(addMinutes(now, 30).toISOString()).toBe("2026-06-24T12:30:00.000Z");
    expect(addTokenDays(now, 7).toISOString()).toBe("2026-07-01T12:00:00.000Z");
  });

  it("considera token expirado quando chega no limite", () => {
    const now = new Date("2026-06-24T12:00:00.000Z");

    expect(isExpired(new Date("2026-06-24T11:59:59.000Z"), now)).toBe(true);
    expect(isExpired(new Date("2026-06-24T12:00:00.000Z"), now)).toBe(true);
    expect(isExpired(new Date("2026-06-24T12:00:01.000Z"), now)).toBe(false);
  });
});
