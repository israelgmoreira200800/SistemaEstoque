import type { Prisma } from "../../generated/prisma/client";
import { ALL_PERMISSION_KEYS, PERMISSIONS, type PermissionDefinition, type PermissionKey } from "../auth/permissions";
import { normalizeEmail } from "../auth/password";
import {
  DEFAULT_ROLE_PROFILES,
  DEFAULT_SECTORS,
  DEFAULT_USAGE_LIMITS,
} from "./defaults";

type TenantStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";

export type CompanyOnboardingInput = {
  company: {
    name: string;
    slug: string;
    legalName?: string;
    tradeName?: string;
    document?: string;
    email?: string;
    phone?: string;
    timezone: string;
    status: TenantStatus;
    planId: string;
    trialDays: number;
  };
  admin: {
    name: string;
    email: string;
    passwordHash: string;
  };
  platformUserId: string;
  now?: Date;
};

export function slugifyTenant(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function subscriptionStatusForCompany(status: TenantStatus) {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "SUSPENDED") return "SUSPENDED";
  return "TRIALING";
}

export async function ensurePermissionCatalog(
  tx: Prisma.TransactionClient,
  options: { pruneUnknown?: boolean } = {},
) {
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((permission) => {
      const record: PermissionDefinition = permission;
      return tx.permission.upsert({
        where: { key: record.key },
        update: {
          module: record.module,
          action: record.action,
          name: record.name,
          description: record.description,
        },
        create: record,
      });
    }),
  );

  if (options.pruneUnknown) {
    await tx.permission.deleteMany({
      where: { key: { notIn: [...ALL_PERMISSION_KEYS] } },
    });
  }

  return new Map(permissionRecords.map((permission) => [permission.key, permission]));
}

export async function prepareCompanyDefaults(
  tx: Prisma.TransactionClient,
  companyId: string,
  permissionByKey: Map<string, { id: string }>,
) {
  const sectors = await Promise.all(
    DEFAULT_SECTORS.map((name) =>
      tx.sector.upsert({
        where: { companyId_name: { companyId, name } },
        update: { status: "ACTIVE" },
        create: { companyId, name },
      }),
    ),
  );

  const roles = await Promise.all(
    DEFAULT_ROLE_PROFILES.map(async (profile) => {
      const role = await tx.role.upsert({
        where: { companyId_slug: { companyId, slug: profile.slug } },
        update: {
          name: profile.name,
          description: profile.description,
          status: "ACTIVE",
          isSystem: profile.slug === "administrador",
        },
        create: {
          companyId,
          name: profile.name,
          slug: profile.slug,
          description: profile.description,
          isSystem: profile.slug === "administrador",
        },
      });

      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({
        data: profile.permissions.map((permissionKey: PermissionKey) => {
          const permission = permissionByKey.get(permissionKey);
          if (!permission) throw new Error(`Permissao padrao ausente: ${permissionKey}`);
          return {
            roleId: role.id,
            permissionId: permission.id,
          };
        }),
        skipDuplicates: true,
      });

      return role;
    }),
  );

  const administratorRole = roles.find((role) => role.slug === "administrador");
  if (!administratorRole) throw new Error("Cargo Administrador nao preparado.");

  const administrationSector = sectors.find((sector) => sector.name === "Administração");

  const unit = await tx.unit.upsert({
    where: { companyId_symbol: { companyId, symbol: "UN" } },
    update: { name: "Unidade", allowsFraction: false, status: "ACTIVE" },
    create: { companyId, name: "Unidade", symbol: "UN", allowsFraction: false },
  });

  const category = await tx.itemCategory.upsert({
    where: { companyId_name: { companyId, name: "Geral" } },
    update: { status: "ACTIVE" },
    create: { companyId, name: "Geral" },
  });

  return {
    sectors,
    roles,
    administratorRole,
    administrationSector,
    unit,
    category,
  };
}

export async function createCompanyOnboarding(
  tx: Prisma.TransactionClient,
  input: CompanyOnboardingInput,
) {
  const now = input.now ?? new Date();
  const trialStartedAt = input.company.status === "TRIAL" ? now : undefined;
  const trialEndsAt = input.company.status === "TRIAL" ? addDays(now, input.company.trialDays) : undefined;
  const permissionByKey = await ensurePermissionCatalog(tx);

  const company = await tx.company.create({
    data: {
      name: input.company.name,
      slug: input.company.slug,
      legalName: input.company.legalName,
      tradeName: input.company.tradeName,
      document: input.company.document,
      email: input.company.email,
      phone: input.company.phone,
      timezone: input.company.timezone,
      status: input.company.status,
      planId: input.company.planId,
      trialStartedAt,
      trialEndsAt,
      activatedAt: input.company.status === "ACTIVE" ? now : undefined,
      suspendedAt: input.company.status === "SUSPENDED" ? now : undefined,
    },
  });

  const subscription = await tx.subscription.create({
    data: {
      companyId: company.id,
      planId: input.company.planId,
      status: subscriptionStatusForCompany(input.company.status),
      startedAt: now,
      trialStartedAt,
      trialEndsAt,
      currentPeriodStartedAt: input.company.status === "ACTIVE" ? now : undefined,
    },
  });

  await tx.usageLimit.createMany({
    data: DEFAULT_USAGE_LIMITS.map((limit) => ({
      companyId: company.id,
      subscriptionId: subscription.id,
      ...limit,
    })),
    skipDuplicates: true,
  });

  await tx.billingEvent.create({
    data: {
      companyId: company.id,
      subscriptionId: subscription.id,
      type: "subscription.created_by_onboarding",
      metadata: { planId: input.company.planId, status: subscription.status },
    },
  });

  const defaults = await prepareCompanyDefaults(tx, company.id, permissionByKey);
  const adminUser = await tx.user.create({
    data: {
      companyId: company.id,
      name: input.admin.name,
      email: normalizeEmail(input.admin.email),
      passwordHash: input.admin.passwordHash,
    },
  });

  await tx.userRole.create({
    data: { userId: adminUser.id, roleId: defaults.administratorRole.id },
  });

  if (defaults.administrationSector) {
    await tx.userSector.create({
      data: { userId: adminUser.id, sectorId: defaults.administrationSector.id },
    });
  }

  await tx.auditLog.create({
    data: {
      companyId: company.id,
      userId: adminUser.id,
      action: "company.onboarding.completed",
      entityType: "company",
      entityId: company.id,
      metadata: {
        adminUserId: adminUser.id,
        defaultUnitId: defaults.unit.id,
        defaultCategoryId: defaults.category.id,
        planId: input.company.planId,
        subscriptionId: subscription.id,
        roleProfiles: DEFAULT_ROLE_PROFILES.map((role) => role.slug),
      },
    },
  });

  await tx.platformAuditLog.create({
    data: {
      platformUserId: input.platformUserId,
      companyId: company.id,
      action: "platform.company.onboarded",
      entityType: "company",
      entityId: company.id,
      metadata: {
        adminUserId: adminUser.id,
        adminEmail: normalizeEmail(input.admin.email),
        planId: input.company.planId,
        subscriptionId: subscription.id,
        trialEndsAt,
        status: company.status,
      },
    },
  });

  return { company, adminUser, subscription, ...defaults };
}
