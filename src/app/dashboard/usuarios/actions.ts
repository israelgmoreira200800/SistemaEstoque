"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/auth/permissions";
import { wouldAffectLastPermissionManager } from "@/lib/auth/admin-guards";
import { createAccountToken } from "@/lib/auth/account-tokens";
import { hashPassword, normalizeEmail } from "@/lib/auth/password";
import { consumeUsageLimit, syncUsageLimitCounter } from "@/lib/billing/usage-limits";
import { deliverOutboxEmail } from "@/lib/email/smtp";
import { createRoleSchema, createSectorSchema, inviteUserSchema } from "@/lib/users/validation";
import { createUserInvitation } from "@/lib/users/invitations";
import { prisma } from "@/lib/prisma";

export type AccessActionState = { success?: string; error?: string };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function selectedPermissionKeys(formData: FormData) {
  const selected = new Set(formData.getAll("permissionKey").map(String));
  return ALL_PERMISSION_KEYS.filter((key) => selected.has(key));
}

export async function createUserAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("user.create");
  const parsed = inviteUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const passwordHash = await hashPassword(createAccountToken().token);
  const roleId = parsed.data.roleId || undefined;
  const sectorId = parsed.data.sectorId || undefined;

  if (roleId) {
    const role = await prisma.role.findFirst({ where: { id: roleId, companyId: session.company.id, status: "ACTIVE" } });
    if (!role) return { error: "Cargo inválido." };
  }
  if (sectorId) {
    const sector = await prisma.sector.findFirst({ where: { id: sectorId, companyId: session.company.id, status: "ACTIVE" } });
    if (!sector) return { error: "Setor inválido." };
  }

  try {
    const emailMessage = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId: session.company.id,
          name: parsed.data.name,
          email: normalizeEmail(parsed.data.email),
          passwordHash,
          status: "BLOCKED",
        },
      });
      if (roleId) await tx.userRole.create({ data: { userId: user.id, roleId } });
      if (sectorId) await tx.userSector.create({ data: { userId: user.id, sectorId } });
      const { invitation, emailMessage } = await createUserInvitation(tx, {
        companyId: session.company.id,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        createdByUserId: session.user.id,
      });
      await tx.auditLog.create({
        data: {
          companyId: session.company.id,
          userId: session.user.id,
          action: "user.invited",
          entityType: "user",
          entityId: user.id,
          metadata: { roleId, sectorId, invitationId: invitation.id, emailOutboxId: emailMessage.id },
        },
      });

      return emailMessage;
    });
    await deliverOutboxEmail(emailMessage);
  } catch (error) {
    return { error: isUniqueError(error) ? "Já existe usuário com esse e-mail." : "Não foi possível criar o usuário." };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: "Convite criado e e-mail enfileirado." };
}

export async function toggleUserStatusAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("user.block");
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.findFirst({ where: { id, companyId: session.company.id } });
  if (!user) return { error: "Usuário não encontrado." };
  if (user.id === session.user.id) return { error: "Você não pode bloquear seu próprio usuário." };

  const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
  if (nextStatus === "BLOCKED" && await wouldAffectLastPermissionManager(session.company.id, user.id)) {
    return { error: "Não é possível bloquear o último usuário com acesso administrativo." };
  }

  const result = await prisma.$transaction(async (tx) => {
    if (nextStatus === "ACTIVE") {
      const usage = await consumeUsageLimit(tx, {
        companyId: session.company.id,
        key: "users",
      });
      if (!usage.allowed) return { error: usage.error };
    }

    await tx.user.updateMany({ where: { id: user.id, companyId: session.company.id }, data: { status: nextStatus } });

    if (nextStatus === "BLOCKED") {
      await tx.session.deleteMany({ where: { userId: user.id, companyId: session.company.id } });
      await syncUsageLimitCounter(tx, { companyId: session.company.id, key: "users" });
    }

    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: nextStatus === "ACTIVE" ? "user.unblocked" : "user.blocked",
        entityType: "user",
        entityId: user.id,
      },
    });

    return { success: true };
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/dashboard/usuarios");
  return { success: nextStatus === "ACTIVE" ? "Usuário desbloqueado." : "Usuário bloqueado." };
}

export async function resendUserInviteAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("user.update");
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.findFirst({ where: { id, companyId: session.company.id } });
  if (!user) return { error: "Usuario nao encontrado." };
  if (user.status !== "BLOCKED") return { error: "Apenas usuarios bloqueados podem receber novo convite." };

  const emailMessage = await prisma.$transaction(async (tx) => {
    const { invitation, emailMessage } = await createUserInvitation(tx, {
      companyId: session.company.id,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      createdByUserId: session.user.id,
    });
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "user.invite.resent",
        entityType: "user",
        entityId: user.id,
        metadata: { invitationId: invitation.id, emailOutboxId: emailMessage.id },
      },
    });

    return emailMessage;
  });
  await deliverOutboxEmail(emailMessage);

  revalidatePath("/dashboard/usuarios");
  return { success: "Convite reenviado e e-mail enfileirado." };
}

export async function assignRoleAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("user.update");
  if (!session.permissions.has("permission.manage")) {
    return { error: "Você não tem permissão para gerenciar cargos de usuários." };
  }
  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");
  const operation = String(formData.get("operation") ?? "add");
  const [user, role] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, companyId: session.company.id } }),
    prisma.role.findFirst({
      where: { id: roleId, companyId: session.company.id },
      include: { permissions: { include: { permission: true } } },
    }),
  ]);
  if (!user || !role) return { error: "Usuário ou cargo inválido." };

  if (
    operation === "remove" &&
    role.permissions.some(({ permission }) => permission.key === "permission.manage") &&
    await wouldAffectLastPermissionManager(session.company.id, user.id)
  ) {
    return { error: "Não é possível remover o último acesso administrativo." };
  }

  await prisma.$transaction(async (tx) => {
    if (operation === "remove") {
      await tx.userRole.deleteMany({ where: { userId, roleId } });
    } else {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: {},
        create: { userId, roleId },
      });
    }
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: operation === "remove" ? "user.role.removed" : "user.role.assigned",
        entityType: "user",
        entityId: userId,
        metadata: { roleId },
      },
    });
  });

  revalidatePath("/dashboard/usuarios");
  return { success: operation === "remove" ? "Cargo removido." : "Cargo adicionado." };
}

export async function setUserPermissionOverrideAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("permission.manage");
  const userId = String(formData.get("userId") ?? "");
  const permissionKey = String(formData.get("permissionKey") ?? "");
  const effect = String(formData.get("effect") ?? "");
  if (!["GRANT", "DENY", "REMOVE"].includes(effect)) return { error: "Ação inválida." };
  if (!ALL_PERMISSION_KEYS.includes(permissionKey as PermissionKey)) return { error: "Permissão inválida." };

  const [user, permission] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, companyId: session.company.id } }),
    prisma.permission.findUnique({ where: { key: permissionKey } }),
  ]);
  if (!user || !permission) return { error: "Usuário ou permissão inválida." };

  if (
    permissionKey === "permission.manage" &&
    (effect === "DENY" || effect === "REMOVE") &&
    await wouldAffectLastPermissionManager(session.company.id, user.id)
  ) {
    return { error: "Não é possível remover o último acesso administrativo." };
  }

  await prisma.$transaction(async (tx) => {
    if (effect === "REMOVE") {
      await tx.userPermissionOverride.deleteMany({ where: { userId, permissionId: permission.id } });
    } else {
      await tx.userPermissionOverride.upsert({
        where: { userId_permissionId: { userId, permissionId: permission.id } },
        update: { effect: effect as "GRANT" | "DENY", createdByUserId: session.user.id },
        create: { userId, permissionId: permission.id, effect: effect as "GRANT" | "DENY", createdByUserId: session.user.id },
      });
    }
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "user.permission_override.changed",
        entityType: "user",
        entityId: userId,
        metadata: { permissionKey, effect },
      },
    });
  });

  revalidatePath("/dashboard/usuarios");
  return { success: "Permissão individual atualizada." };
}

export async function createRoleAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("role.create");
  if (!session.permissions.has("permission.manage")) {
    return { error: "Você não tem permissão para definir permissões de cargos." };
  }
  const parsed = createRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const permissions = await prisma.permission.findMany({
    where: { key: { in: selectedPermissionKeys(formData) } },
  });

  try {
    await prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          companyId: session.company.id,
          name: parsed.data.name,
          slug: slugify(parsed.data.name),
          description: parsed.data.description,
        },
      });
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
        skipDuplicates: true,
      });
      await tx.auditLog.create({
        data: {
          companyId: session.company.id,
          userId: session.user.id,
          action: "role.created",
          entityType: "role",
          entityId: role.id,
          metadata: { permissions: permissions.map((permission) => permission.key) },
        },
      });
    });
  } catch (error) {
    return { error: isUniqueError(error) ? "Já existe um cargo com esse nome." : "Não foi possível criar o cargo." };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: "Cargo criado." };
}

export async function updateRoleAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("role.update");
  if (!session.permissions.has("permission.manage")) return { error: "Você não pode alterar permissões." };
  const id = String(formData.get("id") ?? "");
  const parsed = createRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const role = await prisma.role.findFirst({
    where: { id, companyId: session.company.id },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) return { error: "Cargo não encontrado." };

  const permissionKeys = selectedPermissionKeys(formData);
  const removesPermissionManage =
    role.permissions.some(({ permission }) => permission.key === "permission.manage") &&
    !permissionKeys.includes("permission.manage");
  if (removesPermissionManage && await prisma.userRole.count({ where: { roleId: role.id } }) > 0) {
    const managers = await prisma.user.findMany({ where: { companyId: session.company.id, status: "ACTIVE" }, select: { id: true } });
    for (const manager of managers) {
      if (await wouldAffectLastPermissionManager(session.company.id, manager.id)) {
        return { error: "Não é possível remover o último acesso administrativo." };
      }
    }
  }

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  await prisma.$transaction(async (tx) => {
    await tx.role.updateMany({
      where: { id: role.id, companyId: session.company.id },
      data: { name: parsed.data.name, description: parsed.data.description },
    });
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    await tx.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "role.updated",
        entityType: "role",
        entityId: role.id,
        metadata: { permissions: permissions.map((permission) => permission.key) },
      },
    });
  });

  revalidatePath("/dashboard/usuarios");
  return { success: "Cargo atualizado." };
}

export async function duplicateRoleAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("role.duplicate");
  if (!session.permissions.has("permission.manage")) {
    return { error: "Você não tem permissão para duplicar cargos." };
  }
  const id = String(formData.get("id") ?? "");
  const role = await prisma.role.findFirst({
    where: { id, companyId: session.company.id },
    include: { permissions: true },
  });
  if (!role) return { error: "Cargo não encontrado." };

  const name = `${role.name} cópia`;
  const duplicated = await prisma.$transaction(async (tx) => {
    const newRole = await tx.role.create({
      data: {
        companyId: session.company.id,
        name,
        slug: `${role.slug}-copia-${Date.now()}`,
        description: role.description,
      },
    });
    await tx.rolePermission.createMany({
      data: role.permissions.map(({ permissionId }) => ({ roleId: newRole.id, permissionId })),
    });
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "role.duplicated",
        entityType: "role",
        entityId: newRole.id,
        metadata: { sourceRoleId: role.id },
      },
    });
    return newRole;
  });

  revalidatePath("/dashboard/usuarios");
  return { success: `Cargo "${duplicated.name}" criado.` };
}

export async function inactivateRoleAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("role.inactivate");
  if (!session.permissions.has("permission.manage")) {
    return { error: "Você não tem permissão para inativar cargos." };
  }
  const id = String(formData.get("id") ?? "");
  const role = await prisma.role.findFirst({
    where: { id, companyId: session.company.id },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) return { error: "Cargo não encontrado." };
  if (role.isSystem) return { error: "Cargo de sistema não pode ser inativado." };
  if (
    role.permissions.some(({ permission }) => permission.key === "permission.manage") &&
    await prisma.userRole.count({ where: { roleId: role.id } }) > 0 &&
    await (async () => {
      const managers = await prisma.user.findMany({ where: { companyId: session.company.id, status: "ACTIVE" }, select: { id: true } });
      for (const manager of managers) {
        if (await wouldAffectLastPermissionManager(session.company.id, manager.id)) return true;
      }
      return false;
    })()
  ) {
    return { error: "Não é possível inativar o último cargo que mantém acesso administrativo." };
  }

  await prisma.$transaction([
    prisma.role.updateMany({ where: { id: role.id, companyId: session.company.id }, data: { status: "INACTIVE" } }),
    prisma.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: "role.inactivated",
        entityType: "role",
        entityId: role.id,
      },
    }),
  ]);

  revalidatePath("/dashboard/usuarios");
  return { success: "Cargo inativado." };
}

export async function createSectorAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("user.update");
  const parsed = createSectorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await prisma.$transaction(async (tx) => {
      const sector = await tx.sector.create({ data: { companyId: session.company.id, ...parsed.data } });
      await tx.auditLog.create({
        data: {
          companyId: session.company.id,
          userId: session.user.id,
          action: "sector.created",
          entityType: "sector",
          entityId: sector.id,
        },
      });
    });
  } catch (error) {
    return { error: isUniqueError(error) ? "Já existe um setor com esse nome." : "Não foi possível criar o setor." };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: "Setor criado." };
}

export async function assignSectorAction(
  _state: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const session = await requirePermission("user.update");
  const userId = String(formData.get("userId") ?? "");
  const sectorId = String(formData.get("sectorId") ?? "");
  const operation = String(formData.get("operation") ?? "add");
  const [user, sector] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, companyId: session.company.id } }),
    prisma.sector.findFirst({ where: { id: sectorId, companyId: session.company.id } }),
  ]);
  if (!user || !sector) return { error: "Usuário ou setor inválido." };

  await prisma.$transaction(async (tx) => {
    if (operation === "remove") {
      await tx.userSector.deleteMany({ where: { userId, sectorId } });
    } else {
      await tx.userSector.upsert({
        where: { userId_sectorId: { userId, sectorId } },
        update: {},
        create: { userId, sectorId },
      });
    }
    await tx.auditLog.create({
      data: {
        companyId: session.company.id,
        userId: session.user.id,
        action: operation === "remove" ? "user.sector.removed" : "user.sector.assigned",
        entityType: "user",
        entityId: userId,
        metadata: { sectorId },
      },
    });
  });

  revalidatePath("/dashboard/usuarios");
  return { success: operation === "remove" ? "Setor removido." : "Setor adicionado." };
}
