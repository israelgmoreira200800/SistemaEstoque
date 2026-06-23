const DECIMAL_SCALE = 6;

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toString" in value) return Number(value.toString());
  return 0;
}

export function toQuantityString(value: number) {
  return value
    .toFixed(DECIMAL_SCALE)
    .replace(/\.?0+$/, "");
}

export function multiplyQuantity(quantity: string, factor: string) {
  return toQuantityString(toNumber(quantity) * toNumber(factor));
}

export function availableQuantity(balance?: {
  quantityOnHand: unknown;
  quantityReserved: unknown;
  quantityBlocked: unknown;
} | null) {
  if (!balance) return 0;
  return toNumber(balance.quantityOnHand) - toNumber(balance.quantityReserved) - toNumber(balance.quantityBlocked);
}

export function isWholeQuantity(quantity: string) {
  return Number.isInteger(toNumber(quantity));
}

export function formatQuantity(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: DECIMAL_SCALE,
  }).format(toNumber(value));
}

