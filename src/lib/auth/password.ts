import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function deriveKey(password: string, salt: Buffer, cost = COST) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: cost, r: BLOCK_SIZE, p: PARALLELIZATION },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("pt-BR");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, costValue, blockSize, parallelization, saltValue, keyValue] =
    encoded.split("$");

  if (
    algorithm !== "scrypt" ||
    !costValue ||
    !blockSize ||
    !parallelization ||
    !saltValue ||
    !keyValue
  ) {
    return false;
  }

  const cost = Number(costValue);
  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(keyValue, "base64url");

  if (!Number.isSafeInteger(cost) || expected.length !== KEY_LENGTH) return false;

  try {
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password,
        salt,
        expected.length,
        { N: cost, r: Number(blockSize), p: Number(parallelization) },
        (error, key) => {
          if (error) reject(error);
          else resolve(key);
        },
      );
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

