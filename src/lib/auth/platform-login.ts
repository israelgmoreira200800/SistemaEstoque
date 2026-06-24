import { headers } from "next/headers";
import { createPlatformSession } from "@/lib/auth/platform-session";
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type PlatformLoginResult =
  | { success: true }
  | { success: false; message: string; fields?: { email?: string[]; password?: string[] } };

async function requestIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    undefined
  );
}

export async function authenticatePlatform(formData: FormData): Promise<PlatformLoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os campos destacados.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  const email = normalizeEmail(parsed.data.email);
  const platformUser = await prisma.platformUser.findUnique({ where: { email } });

  if (!platformUser) {
    await hashPassword(parsed.data.password);
    return { success: false, message: "E-mail ou senha inválidos." };
  }

  if (platformUser.lockedUntil && platformUser.lockedUntil > new Date()) {
    await hashPassword(parsed.data.password);
    return {
      success: false,
      message: "Acesso temporariamente bloqueado. Tente novamente em alguns minutos.",
    };
  }

  const passwordMatches = await verifyPassword(parsed.data.password, platformUser.passwordHash);

  if (!passwordMatches || platformUser.status !== "ACTIVE") {
    const attempts = platformUser.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
        : null;

    await prisma.$transaction([
      prisma.platformUser.update({
        where: { id: platformUser.id },
        data: {
          failedLoginAttempts: lockedUntil ? 0 : attempts,
          lockedUntil,
        },
      }),
      prisma.platformAuditLog.create({
        data: {
          platformUserId: platformUser.id,
          action: "platform.auth.login.failed",
          ipAddress: await requestIp(),
          metadata: { locked: Boolean(lockedUntil) },
        },
      }),
    ]);

    return { success: false, message: "E-mail ou senha inválidos." };
  }

  await prisma.$transaction([
    prisma.platformUser.update({
      where: { id: platformUser.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    }),
    prisma.platformAuditLog.create({
      data: {
        platformUserId: platformUser.id,
        action: "platform.auth.login.succeeded",
        ipAddress: await requestIp(),
      },
    }),
  ]);

  await createPlatformSession(platformUser.id);
  return { success: true };
}
