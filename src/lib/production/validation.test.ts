import { describe, expect, it } from "vitest";
import { productionSchema } from "./validation";

describe("productionSchema", () => {
  it("aceita apenas dados operacionais da producao", () => {
    const parsed = productionSchema.safeParse({
      productId: "product-1",
      quantity: "10",
      lossQuantity: "0",
      lotNumber: "L-001",
      note: "turno da manha",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejeita componentes enviados manualmente pelo frontend", () => {
    const parsed = productionSchema.safeParse({
      productId: "product-1",
      quantity: "10",
      components: [{ componentItemId: "item-1", quantity: "999" }],
    });

    expect(parsed.success).toBe(false);
  });
});
