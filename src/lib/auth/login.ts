import { headers } from "next/headers";
import { canAccessCompany } from "@/lib/auth/company-access";
import { createSession } from "@/lib/auth/session";
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type LoginResult =
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

export async function authenticate(formData: FormData): Promise<LoginResult> {
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
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      company: {
        include: {
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true },
          },
        },
      },
    },
  });

  if (!user) {
    await hashPassword(parsed.data.password);
    return { success: false, message: "E-mail ou senha inválidos." };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await hashPassword(parsed.data.password);
    return {
      success: false,
      message: "Acesso temporariamente bloqueado. Tente novamente em alguns minutos.",
    };
  }

  const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);

  if (
    !passwordMatches ||
    user.status !== "ACTIVE" ||
    !canAccessCompany(user.company.status, user.company.subscriptions[0]?.status)
  ) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
        : null;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockedUntil ? 0 : attempts,
          lockedUntil,
        },
      }),
      prisma.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          action: "auth.login.failed",
          ipAddress: await requestIp(),
          metadata: { locked: Boolean(lockedUntil) },
        },
      }),
    ]);

    return { success: false, message: "E-mail ou senha inválidos." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "auth.login.succeeded",
        ipAddress: await requestIp(),
      },
    }),
  ]);

  await createSession(user.id, user.companyId);
  return { success: true };
}
