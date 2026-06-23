import { describe, expect, it } from "vitest";
import { createCategorySchema, createItemSchema, createUnitSchema, unitConversionSchema } from "./validation";

describe("validação do catálogo", () => {
  it("normaliza unidade e aceita quantidade fracionária", () => {
    const unit = createUnitSchema.parse({ name: "Quilograma", symbol: "kg", allowsFraction: true });
    expect(unit.symbol).toBe("KG");

    const item = createItemSchema.parse({
      name: "Massa base",
      type: "RAW_MATERIAL",
      unitId: "unit-1",
      categoryId: "",
      sku: " mp-01 ",
      barcode: "",
      minimumStock: "12,500",
      description: "",
    });
    expect(item.minimumStock).toBe("12.500");
    expect(item.sku).toBe("MP-01");
    expect(item.categoryId).toBeUndefined();
  });

  it("rejeita nomes e quantidades inválidas", () => {
    expect(createCategorySchema.safeParse({ name: "A" }).success).toBe(false);
    expect(
      createItemSchema.safeParse({
        name: "Item válido",
        type: "COMPONENT",
        unitId: "",
        categoryId: "",
        sku: "",
        barcode: "",
        minimumStock: "-1",
        description: "",
      }).success,
    ).toBe(false);
  });

  it("aceita somente fatores de conversão positivos", () => {
    expect(unitConversionSchema.safeParse({ itemId: "item", sourceUnitId: "caixa", factorToStockUnit: "24" }).success).toBe(true);
    expect(unitConversionSchema.safeParse({ itemId: "item", sourceUnitId: "caixa", factorToStockUnit: "0" }).success).toBe(false);
    expect(unitConversionSchema.safeParse({ itemId: "item", sourceUnitId: "caixa", factorToStockUnit: "-2" }).success).toBe(false);
  });
});
