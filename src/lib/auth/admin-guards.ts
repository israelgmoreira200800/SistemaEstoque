import { resolveEffectivePermissions } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function userHasPermissionManage(companyId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      permissionOverrides: { include: { permission: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return false;

  const { permissions } = resolveEffectivePermissions({
    userStatus: user.status,
    rolePermissions: user.roles
      .filter(({ role }) => role.status === "ACTIVE")
      .flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)),
    userOverrides: user.permissionOverrides.map((override) => ({
      key: override.permission.key,
      effect: override.effect,
    })),
  });

  return permissions.has("permission.manage");
}

export async function countActivePermissionManagers(companyId: string) {
  const users = await prisma.user.findMany({
    where: { companyId, status: "ACTIVE" },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      permissionOverrides: { include: { permission: true } },
    },
  });

  return users.filter((user) => {
    const { permissions } = resolveEffectivePermissions({
      userStatus: user.status,
      rolePermissions: user.roles
        .filter(({ role }) => role.status === "ACTIVE")
        .flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)),
      userOverrides: user.permissionOverrides.map((override) => ({
        key: override.permission.key,
        effect: override.effect,
      })),
    });
    return permissions.has("permission.manage");
  }).length;
}

export async function wouldAffectLastPermissionManager(companyId: string, userId: string) {
  const [count, targetIsManager] = await Promise.all([
    countActivePermissionManagers(companyId),
    userHasPermissionManage(companyId, userId),
  ]);
  return targetIsManager && count <= 1;
}
