import { describe, expect, it } from "vitest";
import { quantitySchema, stockAdjustmentRequestSchema } from "./validation";

describe("quantitySchema", () => {
  it("aceita quantidade positiva com vírgula e normaliza para ponto", () => {
    expect(quantitySchema.parse("10,5")).toBe("10.5");
  });

  it("rejeita zero e negativos", () => {
    expect(quantitySchema.safeParse("0").success).toBe(false);
    expect(quantitySchema.safeParse("-1").success).toBe(false);
  });
});

describe("stockAdjustmentRequestSchema", () => {
  it("aceita saldo solicitado igual a zero para inventario", () => {
    const parsed = stockAdjustmentRequestSchema.parse({
      itemId: "item-1",
      kind: "INVENTORY",
      requestedQuantity: "0",
      documentNumber: "",
      reason: "Contagem fisica",
    });

    expect(parsed.requestedQuantity).toBe("0");
    expect(parsed.documentNumber).toBeUndefined();
  });

  it("rejeita motivo vazio", () => {
    expect(
      stockAdjustmentRequestSchema.safeParse({
        itemId: "item-1",
        kind: "ADJUSTMENT",
        requestedQuantity: "5",
        reason: "",
      }).success,
    ).toBe(false);
  });
});
