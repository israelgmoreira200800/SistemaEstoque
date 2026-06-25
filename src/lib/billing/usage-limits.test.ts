import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "../../generated/prisma/client";
import { consumeUsageLimit, syncUsageLimitCounter, usageLimitExceededMessage } from "./usage-limits";

type UsageLimitRow = {
  key: string;
  limitValue: number | null;
  usedValue: number;
  unit: string | null;
};

function createTransactionClient(options: {
  queryResults: UsageLimitRow[][];
  configuredLimit?: UsageLimitRow | null;
}) {
  const queryResults = [...options.queryResults];
  const $queryRaw = vi.fn(async () => queryResults.shift() ?? []);
  const findUnique = vi.fn(async () => options.configuredLimit ?? null);

  return {
    tx: {
      $queryRaw,
      usageLimit: { findUnique },
    } as unknown as Prisma.TransactionClient,
    $queryRaw,
    findUnique,
  };
}

describe("consumeUsageLimit", () => {
  it("consome limite configurado quando ainda ha capacidade", async () => {
    const limit = { key: "users", limitValue: 2, usedValue: 2, unit: "usuarios" };
    const { tx, $queryRaw, findUnique } = createTransactionClient({
      queryResults: [[limit]],
    });

    const result = await consumeUsageLimit(tx, { companyId: "company-1", key: "users" });

    expect(result).toEqual({ allowed: true, limit });
    expect($queryRaw).toHaveBeenCalledOnce();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("permite continuar quando nao ha limite configurado", async () => {
    const { tx, findUnique } = createTransactionClient({
      queryResults: [[]],
      configuredLimit: null,
    });

    const result = await consumeUsageLimit(tx, { companyId: "company-1", key: "items" });

    expect(result).toEqual({ allowed: true, limit: null });
    expect(findUnique).toHaveBeenCalledWith({
      where: { companyId_key: { companyId: "company-1", key: "items" } },
      select: { key: true, limitValue: true, usedValue: true, unit: true },
    });
  });

  it("bloqueia quando o limite configurado ja foi atingido", async () => {
    const configuredLimit = { key: "items", limitValue: 1, usedValue: 1, unit: "itens" };
    const { tx, $queryRaw } = createTransactionClient({
      queryResults: [[], [configuredLimit]],
      configuredLimit,
    });

    const result = await consumeUsageLimit(tx, { companyId: "company-1", key: "items" });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.error).toBe("Limite de itens ativos atingido (1/1 itens). Ajuste o plano ou inative registros antes de continuar.");
      expect(result.limit).toEqual(configuredLimit);
    }
    expect($queryRaw).toHaveBeenCalledTimes(2);
  });
});

describe("syncUsageLimitCounter", () => {
  it("sincroniza o contador pelo uso ativo atual", async () => {
    const limit = { key: "users", limitValue: 50, usedValue: 3, unit: "usuarios" };
    const { tx, $queryRaw } = createTransactionClient({
      queryResults: [[limit]],
    });

    await expect(syncUsageLimitCounter(tx, { companyId: "company-1", key: "users" })).resolves.toEqual(limit);
    expect($queryRaw).toHaveBeenCalledOnce();
  });
});

describe("usageLimitExceededMessage", () => {
  it("formata mensagem de limite atingido", () => {
    expect(
      usageLimitExceededMessage({ key: "users", limitValue: 5, usedValue: 5, unit: "usuarios" }),
    ).toBe("Limite de usuarios ativos atingido (5/5 usuarios). Ajuste o plano ou inative registros antes de continuar.");
  });
});
