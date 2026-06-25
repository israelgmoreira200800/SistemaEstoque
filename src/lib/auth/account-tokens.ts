import { createHash, randomBytes } from "node:crypto";

const ACCOUNT_TOKEN_BYTES = 32;

export function createAccountToken() {
  const token = randomBytes(ACCOUNT_TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashAccountToken(token) };
}

export function hashAccountToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addTokenDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function isExpired(expiresAt: Date, now = new Date()) {
  return expiresAt <= now;
}
