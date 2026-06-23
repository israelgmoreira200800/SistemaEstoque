import { describe, expect, it } from "vitest";
import { quantitySchema } from "./validation";

describe("quantitySchema", () => {
  it("aceita quantidade positiva com vírgula e normaliza para ponto", () => {
    expect(quantitySchema.parse("10,5")).toBe("10.5");
  });

  it("rejeita zero e negativos", () => {
    expect(quantitySchema.safeParse("0").success).toBe(false);
    expect(quantitySchema.safeParse("-1").success).toBe(false);
  });
});

