import { z } from "zod";

const booleanEnvSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  return value;
}, z.boolean());

const serverEnvSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  SESSION_COOKIE_NAME: z.string().min(1).default("estoque_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  PLATFORM_SESSION_COOKIE_NAME: z.string().min(1).default("vertice_platform_session"),
  PLATFORM_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: booleanEnvSchema.default(false),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().trim().optional(),
  SMTP_DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
    PLATFORM_SESSION_COOKIE_NAME: process.env.PLATFORM_SESSION_COOKIE_NAME,
    PLATFORM_SESSION_TTL_DAYS: process.env.PLATFORM_SESSION_TTL_DAYS,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_DELIVERY_TIMEOUT_MS: process.env.SMTP_DELIVERY_TIMEOUT_MS,
  });
}
