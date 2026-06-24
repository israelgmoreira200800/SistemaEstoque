import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getRequestMetadata() {
  const requestHeaders = await headers();
  return {
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      undefined,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? undefined,
  };
}

export async function createPlatformSession(platformUserId: string) {
  const env = getServerEnv();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.PLATFORM_SESSION_TTL_DAYS * 86_400_000);
  const metadata = await getRequestMetadata();

  await prisma.platformSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      platformUserId,
      expiresAt,
      ...metadata,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(env.PLATFORM_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/platform",
    expires: expiresAt,
  });
}

export async function getCurrentPlatformSession() {
  const env = getServerEnv();
  const token = (await cookies()).get(env.PLATFORM_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.platformSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { platformUser: true },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.platformUser.status !== "ACTIVE"
  ) {
    if (session) {
      await prisma.platformSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  if (Date.now() - session.lastSeenAt.getTime() > 15 * 60_000) {
    await prisma.platformSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: {
      id: session.platformUser.id,
      name: session.platformUser.name,
      email: session.platformUser.email,
      status: session.platformUser.status,
      role: session.platformUser.role,
    },
  };
}

export type PlatformAuthSession = NonNullable<Awaited<ReturnType<typeof getCurrentPlatformSession>>>;

export async function requirePlatformSession() {
  const session = await getCurrentPlatformSession();
  if (!session) redirect("/platform/login");
  return session;
}

export async function destroyCurrentPlatformSession() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(env.PLATFORM_SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.platformSession
      .delete({ where: { tokenHash: hashSessionToken(token) } })
      .catch(() => undefined);
  }

  cookieStore.delete(env.PLATFORM_SESSION_COOKIE_NAME);
}
