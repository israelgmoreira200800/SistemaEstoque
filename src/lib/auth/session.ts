import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env";
import { resolveEffectivePermissions, type PermissionKey } from "@/lib/auth/permissions";
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

export async function createSession(userId: string, companyId: string) {
  const env = getServerEnv();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);
  const metadata = await getRequestMetadata();

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      companyId,
      expiresAt,
      ...metadata,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentSession() {
  const env = getServerEnv();
  const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      company: true,
      user: {
        include: {
          company: true,
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
          permissionOverrides: {
            include: { permission: true },
          },
          sectors: {
            include: { sector: true },
          },
        },
      },
    },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.company.status !== "ACTIVE" ||
    session.user.status !== "ACTIVE" ||
    session.user.companyId !== session.companyId
  ) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  if (Date.now() - session.lastSeenAt.getTime() > 15 * 60_000) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  const activeRoles = session.user.roles
    .map(({ role }) => role)
    .filter((role) => role.status === "ACTIVE");
  const rolePermissions = activeRoles.flatMap((role) =>
    role.permissions.map(({ permission }) => permission.key),
  );
  const overrideInputs = session.user.permissionOverrides.map((override) => ({
    key: override.permission.key,
    effect: override.effect,
  }));
  const { permissions, grants, denies } = resolveEffectivePermissions({
    userStatus: session.user.status,
    rolePermissions,
    userOverrides: overrideInputs,
  });

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status,
    },
    company: {
      id: session.company.id,
      name: session.company.name,
      slug: session.company.slug,
      timezone: session.company.timezone,
    },
    roles: activeRoles.map((role) => role.name),
    roleIds: activeRoles.map((role) => role.id),
    sectors: session.user.sectors
      .map(({ sector }) => sector)
      .filter((sector) => sector.status === "ACTIVE")
      .map((sector) => ({ id: sector.id, name: sector.name })),
    permissions,
    permissionGrants: grants,
    permissionDenies: denies,
  };
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>;

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePermission(permission: PermissionKey) {
  const session = await requireSession();
  if (!session.permissions.has(permission)) redirect("/dashboard?erro=sem-permissao");
  return session;
}

export async function destroyCurrentSession() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hashSessionToken(token) } })
      .catch(() => undefined);
  }

  cookieStore.delete(env.SESSION_COOKIE_NAME);
}

