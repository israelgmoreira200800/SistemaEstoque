import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";

function createTransactionClient(updateCount: number) {
  const updateMany = vi.fn(async () => ({ count: updateCount }));
  const findUnique = vi.fn(async () => ({
    id: "balance-1",
    companyId: "company-1",
    itemId: "item-1",
    quantityOnHand: "4",
    quantityReserved: "0",
    quantityBlocked: "0",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  }));

  return {
    tx: { stockBalance: { updateMany, findUnique } } as unknown as Prisma.TransactionClient,
    updateMany,
    findUnique,
  };
}

describe("decrementStockBalance", () => {
  it("decrementa apenas quando o saldo atual cobre a quantidade", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { decrementStockBalance } = await import("./service");
    const { tx, updateMany, findUnique } = createTransactionClient(1);

    const result = await decrementStockBalance(tx, {
      companyId: "company-1",
      itemId: "item-1",
      quantity: "6",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        itemId: "item-1",
        item: { companyId: "company-1", status: "ACTIVE" },
        quantityOnHand: { gte: "6" },
      },
      data: { quantityOnHand: { decrement: "6" } },
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { companyId_itemId: { companyId: "company-1", itemId: "item-1" } },
    });
    expect("balance" in result).toBe(true);
  });

  it("recusa o decremento quando nenhuma linha atende a condicao de saldo", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { decrementStockBalance } = await import("./service");
    const { tx, findUnique } = createTransactionClient(0);

    const result = await decrementStockBalance(tx, {
      companyId: "company-1",
      itemId: "item-1",
      quantity: "6",
    });

    expect(result).toEqual({ error: "Estoque insuficiente para esta saida." });
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("reserved stock helpers", () => {
  it("libera reserva apenas quando ha quantidade reservada suficiente", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { releaseReservedStockBalance } = await import("./service");
    const { tx, updateMany, findUnique } = createTransactionClient(1);

    const result = await releaseReservedStockBalance(tx, {
      companyId: "company-1",
      itemId: "item-1",
      quantity: "2",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        itemId: "item-1",
        quantityReserved: { gte: "2" },
      },
      data: { quantityReserved: { decrement: "2" } },
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { companyId_itemId: { companyId: "company-1", itemId: "item-1" } },
    });
    expect("balance" in result).toBe(true);
  });

  it("baixa estoque expedido consumindo reserva atomica", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { shipReservedStockBalance } = await import("./service");
    const { tx, updateMany } = createTransactionClient(1);

    const result = await shipReservedStockBalance(tx, {
      companyId: "company-1",
      itemId: "item-1",
      quantity: "2",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        itemId: "item-1",
        item: { companyId: "company-1", status: "ACTIVE" },
        quantityOnHand: { gte: "2" },
        quantityReserved: { gte: "2" },
      },
      data: {
        quantityOnHand: { decrement: "2" },
        quantityReserved: { decrement: "2" },
      },
    });
    expect("balance" in result).toBe(true);
  });
});

describe("decrementAvailableStockBalance", () => {
  it("recusa baixa quando saldo disponivel atomico nao atende a quantidade", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { decrementAvailableStockBalance } = await import("./service");
    const $queryRaw = vi.fn(async () => []);
    const tx = { $queryRaw } as unknown as Prisma.TransactionClient;

    const result = await decrementAvailableStockBalance(tx, {
      companyId: "company-1",
      itemId: "item-1",
      quantity: "6",
    });

    expect(result).toEqual({ error: "Estoque disponivel insuficiente para esta saida." });
    expect($queryRaw).toHaveBeenCalledOnce();
  });
});
