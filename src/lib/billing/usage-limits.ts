import { Prisma } from "../../generated/prisma/client";

export type UsageLimitKey = "users" | "items";

type UsageLimitSnapshot = {
  key: string;
  limitValue: number | null;
  usedValue: number;
  unit: string | null;
};

type UsageLimitResult =
  | { allowed: true; limit: UsageLimitSnapshot | null }
  | { allowed: false; error: string; limit: UsageLimitSnapshot | null };

const usageLabels: Record<UsageLimitKey, string> = {
  users: "usuarios ativos",
  items: "itens ativos",
};

function currentUsageSql(companyId: string, key: UsageLimitKey) {
  if (key === "users") {
    return Prisma.sql`
      SELECT COUNT(*)::int AS "value"
      FROM "users"
      WHERE "company_id" = ${companyId}
        AND "status" = 'ACTIVE'
    `;
  }

  return Prisma.sql`
    SELECT COUNT(*)::int AS "value"
    FROM "items"
    WHERE "company_id" = ${companyId}
      AND "status" = 'ACTIVE'
  `;
}

function assertPositiveAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Quantidade de uso invalida.");
  }
}

export function usageLimitExceededMessage(limit: UsageLimitSnapshot, label = usageLabels[limit.key as UsageLimitKey] ?? limit.key) {
  const unit = limit.unit ? ` ${limit.unit}` : "";
  const limitValue = limit.limitValue ?? "ilimitado";
  return `Limite de ${label} atingido (${limit.usedValue}/${limitValue}${unit}). Ajuste o plano ou inative registros antes de continuar.`;
}

export async function syncUsageLimitCounter(
  tx: Prisma.TransactionClient,
  input: { companyId: string; key: UsageLimitKey },
) {
  const rows = await tx.$queryRaw<UsageLimitSnapshot[]>(Prisma.sql`
    WITH current_usage AS (${currentUsageSql(input.companyId, input.key)})
    UPDATE "usage_limits"
    SET
      "used_value" = current_usage."value",
      "updated_at" = NOW()
    FROM current_usage
    WHERE "company_id" = ${input.companyId}
      AND "key" = ${input.key}
    RETURNING
      "key",
      "limit_value" AS "limitValue",
      "used_value" AS "usedValue",
      "unit"
  `);

  return rows[0] ?? null;
}

export async function consumeUsageLimit(
  tx: Prisma.TransactionClient,
  input: { companyId: string; key: UsageLimitKey; amount?: number },
): Promise<UsageLimitResult> {
  const amount = input.amount ?? 1;
  assertPositiveAmount(amount);

  const rows = await tx.$queryRaw<UsageLimitSnapshot[]>(Prisma.sql`
    WITH current_usage AS (${currentUsageSql(input.companyId, input.key)})
    UPDATE "usage_limits"
    SET
      "used_value" = GREATEST("usage_limits"."used_value", current_usage."value") + ${amount},
      "updated_at" = NOW()
    FROM current_usage
    WHERE "company_id" = ${input.companyId}
      AND "key" = ${input.key}
      AND (
        "limit_value" IS NULL
        OR GREATEST("usage_limits"."used_value", current_usage."value") + ${amount} <= "limit_value"
      )
    RETURNING
      "key",
      "limit_value" AS "limitValue",
      "used_value" AS "usedValue",
      "unit"
  `);

  if (rows[0]) return { allowed: true, limit: rows[0] };

  const configuredLimit = await tx.usageLimit.findUnique({
    where: { companyId_key: { companyId: input.companyId, key: input.key } },
    select: { key: true, limitValue: true, usedValue: true, unit: true },
  });

  if (!configuredLimit) return { allowed: true, limit: null };

  const syncedLimit = await syncUsageLimitCounter(tx, {
    companyId: input.companyId,
    key: input.key,
  });
  const limit = syncedLimit ?? configuredLimit;

  return {
    allowed: false,
    error: usageLimitExceededMessage(limit),
    limit,
  };
}
