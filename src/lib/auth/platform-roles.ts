import type { PlatformRole } from "@/generated/prisma/enums";
import { requirePlatformSession, type PlatformAuthSession } from "@/lib/auth/platform-session";

export const PLATFORM_COMPANY_MANAGEMENT_ROLES = ["OWNER", "ADMIN"] as const satisfies readonly PlatformRole[];

export function platformRoleCanAccess(role: PlatformRole, allowedRoles: readonly PlatformRole[]) {
  return allowedRoles.includes(role);
}

export async function requirePlatformRole(allowedRoles: readonly PlatformRole[]) {
  const session = await requirePlatformSession();
  if (!platformRoleCanAccess(session.user.role, allowedRoles)) {
    return { error: "Sem permissao para executar esta acao." as const };
  }

  return { session: session as PlatformAuthSession };
}
