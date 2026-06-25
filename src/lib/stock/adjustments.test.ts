import { describe, expect, it } from "vitest";

describe("calculateStockAdjustmentDelta", () => {
  it("calcula aumento ate o saldo solicitado", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { calculateStockAdjustmentDelta } = await import("./adjustments");

    expect(
      calculateStockAdjustmentDelta({
        currentQuantity: "4",
        requestedQuantity: "10.5",
      }),
    ).toMatchObject({
      currentQuantity: "4",
      requestedQuantity: "10.5",
      delta: "6.5",
      absoluteDelta: "6.5",
      direction: "INCREASE",
      isNoop: false,
    });
  });

  it("calcula reducao ate o saldo solicitado", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { calculateStockAdjustmentDelta } = await import("./adjustments");

    expect(
      calculateStockAdjustmentDelta({
        currentQuantity: "8",
        requestedQuantity: "2",
      }),
    ).toMatchObject({
      delta: "-6",
      absoluteDelta: "6",
      direction: "DECREASE",
      isNoop: false,
    });
  });

  it("identifica quando nao ha diferenca", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { calculateStockAdjustmentDelta } = await import("./adjustments");

    expect(
      calculateStockAdjustmentDelta({
        currentQuantity: "3.25",
        requestedQuantity: "3.25",
      }),
    ).toMatchObject({
      delta: "0",
      absoluteDelta: "0",
      direction: "NONE",
      isNoop: true,
    });
  });
});
