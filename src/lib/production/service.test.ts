import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

function decimal(value: string) {
  return { toString: () => value };
}

function product() {
  return {
    id: "product-1",
    companyId: "company-1",
    name: "Produto acabado",
    unit: { allowsFraction: false, symbol: "UN" },
  };
}

function component(options: { companyId?: string; balance?: string; quantity?: string } = {}) {
  return {
    id: "component-row-1",
    companyId: options.companyId ?? "company-1",
    productId: "product-1",
    componentItemId: "component-1",
    quantity: decimal(options.quantity ?? "2"),
    componentItem: {
      id: "component-1",
      companyId: options.companyId ?? "company-1",
      name: "Componente",
      unit: { symbol: "UN" },
      stockBalance: {
        quantityOnHand: options.balance ?? "20",
        quantityReserved: "0",
        quantityBlocked: "0",
      },
    },
  };
}

function createClient(components = [component()]) {
  const tx = {
    item: { findFirst: vi.fn(async () => ({ id: "product-1" })) },
    productComponent: { findMany: vi.fn(async () => components) },
    production: { create: vi.fn(async () => ({ id: "production-1" })) },
    stockBalance: {
      upsert: vi.fn(async () => ({ quantityOnHand: "10" })),
    },
    stockMovement: { create: vi.fn(async (input) => ({ id: `movement-${input.data.type}` })) },
    auditLog: { create: vi.fn(async () => ({ id: "audit-1" })) },
    $queryRaw: vi.fn(async () => [{ quantityOnHand: "18" }]),
  };
  const client = {
    item: { findFirst: vi.fn(async () => product()) },
    productComponent: { findMany: vi.fn(async () => components) },
    $transaction: vi.fn(async (callback) => callback(tx)),
  };

  return { client, tx };
}

describe("finishProductionFromBom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finaliza producao usando ficha tecnica cadastrada no banco", async () => {
    const { finishProductionFromBom } = await import("./service");
    const { client, tx } = createClient();

    const result = await finishProductionFromBom(
      { companyId: "company-1", userId: "user-1", productId: "product-1", quantity: "5" },
      client as never,
    );

    expect(result).toEqual({ success: true });
    expect(client.productComponent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          productId: "product-1",
          status: "ACTIVE",
          product: { companyId: "company-1", status: "ACTIVE" },
          componentItem: { companyId: "company-1", status: "ACTIVE" },
        }),
      }),
    );
    expect(tx.production.create).toHaveBeenCalledOnce();
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });

  it("bloqueia producao sem ficha tecnica ativa", async () => {
    const { finishProductionFromBom } = await import("./service");
    const { client } = createClient([]);

    const result = await finishProductionFromBom(
      { companyId: "company-1", userId: "user-1", productId: "product-1", quantity: "5" },
      client as never,
    );

    expect(result).toEqual({ error: "Produto sem ficha tecnica ativa." });
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it("bloqueia producao com estoque disponivel insuficiente", async () => {
    const { finishProductionFromBom } = await import("./service");
    const { client } = createClient([component({ balance: "4" })]);

    const result = await finishProductionFromBom(
      { companyId: "company-1", userId: "user-1", productId: "product-1", quantity: "5" },
      client as never,
    );

    expect("error" in result).toBe(true);
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it("nao permite producao parcial quando a baixa atomica falha dentro da transacao", async () => {
    const { finishProductionFromBom } = await import("./service");
    const { client, tx } = createClient();
    tx.$queryRaw.mockResolvedValueOnce([]);

    const result = await finishProductionFromBom(
      { companyId: "company-1", userId: "user-1", productId: "product-1", quantity: "5" },
      client as never,
    );

    expect(result).toEqual({ error: "Estoque insuficiente de Componente. Necessario: 10 UN." });
    expect(tx.stockBalance.upsert).not.toHaveBeenCalled();
  });
});
