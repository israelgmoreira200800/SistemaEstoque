import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_COOKIE_NAME: z.string().min(1).default("estoque_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  PLATFORM_SESSION_COOKIE_NAME: z.string().min(1).default("vertice_platform_session"),
  PLATFORM_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
    PLATFORM_SESSION_COOKIE_NAME: process.env.PLATFORM_SESSION_COOKIE_NAME,
    PLATFORM_SESSION_TTL_DAYS: process.env.PLATFORM_SESSION_TTL_DAYS,
  });
}
