import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, normalizeEmail } from "../src/lib/auth/password";
import { ALL_PERMISSION_KEYS, PERMISSIONS, type PermissionDefinition, type PermissionKey } from "../src/lib/auth/permissions";
import { slugifyTenant } from "../src/lib/organization/onboarding";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const roleProfiles: {
  name: string;
  slug: string;
  description: string;
  permissions: PermissionKey[];
}[] = [
  {
    name: "Administrador",
    slug: "administrador",
    description: "Acesso total ao sistema.",
    permissions: [...ALL_PERMISSION_KEYS],
  },
  {
    name: "Gerente",
    slug: "gerente",
    description: "Gerencia operação, pedidos, produção e relatórios, sem alterar usuários ou permissões críticas.",
    permissions: ALL_PERMISSION_KEYS.filter(
      (key) =>
        !key.startsWith("user.") &&
        !key.startsWith("role.") &&
        key !== "permission.manage" &&
        key !== "settings.manage",
    ),
  },
  {
    name: "Pedidos",
    slug: "pedidos",
    description: "Opera pedidos e consulta itens/estoque.",
    permissions: [
      "dashboard.view",
      "item.view",
      "stock.view",
      "order.view",
      "order.create",
      "order.update",
      "order.cancel",
      "order.change_status",
      "shipment.view",
    ],
  },
  {
    name: "Produção",
    slug: "producao",
    description: "Opera fichas técnicas e produção.",
    permissions: [
      "dashboard.view",
      "item.view",
      "bom.view",
      "stock.view",
      "production.view",
      "production.create",
      "production.start",
      "production.finish",
      "production.register_loss",
    ],
  },
  {
    name: "Estoque",
    slug: "estoque",
    description: "Opera entradas, saídas, perdas, ajustes e inventário.",
    permissions: [
      "dashboard.view",
      "item.view",
      "category.view",
      "unit.view",
      "stock.view",
      "stock.entry",
      "stock.exit",
      "stock.loss",
      "stock.adjust",
      "stock.inventory",
    ],
  },
  {
    name: "Expedição",
    slug: "expedicao",
    description: "Separa e despacha pedidos.",
    permissions: [
      "dashboard.view",
      "item.view",
      "stock.view",
      "order.view",
      "shipment.view",
      "shipment.separate",
      "shipment.dispatch",
    ],
  },
  {
    name: "Visualizador",
    slug: "visualizador",
    description: "Consulta informações sem alterar dados.",
    permissions: [
      "dashboard.view",
      "item.view",
      "category.view",
      "unit.view",
      "bom.view",
      "stock.view",
      "order.view",
      "production.view",
      "shipment.view",
      "report.view",
    ],
  },
];

const sectors = [
  "Administração",
  "Compras",
  "Estoque",
  "Produção",
  "Pedidos",
  "Expedição",
  "Financeiro",
];

const defaultPlan = {
  name: "Manual Starter",
  slug: "manual-starter",
  description: "Plano inicial controlado manualmente pela plataforma.",
  monthlyPriceCents: 0,
  currency: "BRL",
  trialDays: 14,
};

const defaultPlanFeatures = [
  { key: "users", name: "Usuários", value: { limit: 50 } },
  { key: "items", name: "Itens", value: { limit: 1000 } },
  { key: "production", name: "Módulo de produção", value: { enabled: true } },
  { key: "audit", name: "Auditoria", value: { enabled: true } },
  { key: "support", name: "Suporte", value: { level: "standard" } },
];

const defaultUsageLimits = [
  { key: "users", limitValue: 50, unit: "usuários" },
  { key: "items", limitValue: 1000, unit: "itens" },
  { key: "exports", limitValue: 100, unit: "exportações/mês" },
];

async function main() {
  const companyName = process.env.SEED_COMPANY_NAME;
  const adminName = process.env.SEED_ADMIN_NAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const platformName = process.env.SEED_PLATFORM_NAME;
  const platformEmail = process.env.SEED_PLATFORM_EMAIL;
  const platformPassword = process.env.SEED_PLATFORM_PASSWORD;
  const platformRole = process.env.SEED_PLATFORM_ROLE ?? "OWNER";

  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    console.log("Seed administrativo ignorado: variáveis SEED_* incompletas.");
    return;
  }

  if (adminPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD deve possuir pelo menos 12 caracteres.");
  }
  if ((platformName || platformEmail || platformPassword) && (!platformName || !platformEmail || !platformPassword)) {
    throw new Error("SEED_PLATFORM_NAME, SEED_PLATFORM_EMAIL e SEED_PLATFORM_PASSWORD devem ser preenchidas juntas.");
  }
  if (platformPassword && platformPassword.length < 12) {
    throw new Error("SEED_PLATFORM_PASSWORD deve possuir pelo menos 12 caracteres.");
  }
  if (!["OWNER", "ADMIN", "OPERATOR", "SUPPORT"].includes(platformRole)) {
    throw new Error("SEED_PLATFORM_ROLE deve ser OWNER, ADMIN, OPERATOR ou SUPPORT.");
  }

  const passwordHash = await hashPassword(adminPassword);
  const platformPasswordHash = platformPassword ? await hashPassword(platformPassword) : null;

  await prisma.$transaction(async (tx) => {
    const now = new Date();
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

    await tx.permission.deleteMany({
      where: { key: { notIn: [...ALL_PERMISSION_KEYS] } },
    });

    const permissionByKey = new Map(permissionRecords.map((permission) => [permission.key, permission]));

    const plan = await tx.plan.upsert({
      where: { slug: defaultPlan.slug },
      update: {
        name: defaultPlan.name,
        description: defaultPlan.description,
        status: "ACTIVE",
        monthlyPriceCents: defaultPlan.monthlyPriceCents,
        currency: defaultPlan.currency,
        trialDays: defaultPlan.trialDays,
      },
      create: defaultPlan,
    });

    await Promise.all(
      defaultPlanFeatures.map((feature) =>
        tx.planFeature.upsert({
          where: { planId_key: { planId: plan.id, key: feature.key } },
          update: { name: feature.name, value: feature.value },
          create: { planId: plan.id, ...feature },
        }),
      ),
    );

    const company = await tx.company.upsert({
      where: { slug: slugifyTenant(companyName) },
      update: { name: companyName, status: "ACTIVE", planId: plan.id },
      create: {
        name: companyName,
        slug: slugifyTenant(companyName),
        status: "ACTIVE",
        planId: plan.id,
        activatedAt: now,
      },
    });

    const subscription = await tx.subscription.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });
    const activeSubscription = subscription
      ? await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodStartedAt: subscription.currentPeriodStartedAt ?? now,
          },
        })
      : await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: plan.id,
            status: "ACTIVE",
            startedAt: now,
            currentPeriodStartedAt: now,
          },
        });

    await Promise.all(
      defaultUsageLimits.map((limit) =>
        tx.usageLimit.upsert({
          where: { companyId_key: { companyId: company.id, key: limit.key } },
          update: {
            subscriptionId: activeSubscription.id,
            limitValue: limit.limitValue,
            unit: limit.unit,
          },
          create: {
            companyId: company.id,
            subscriptionId: activeSubscription.id,
            ...limit,
          },
        }),
      ),
    );

    await Promise.all(
      sectors.map((name) =>
        tx.sector.upsert({
          where: { companyId_name: { companyId: company.id, name } },
          update: { status: "ACTIVE" },
          create: { companyId: company.id, name },
        }),
      ),
    );

    const roles = await Promise.all(
      roleProfiles.map(async (profile) => {
        const role = await tx.role.upsert({
          where: { companyId_slug: { companyId: company.id, slug: profile.slug } },
          update: {
            name: profile.name,
            description: profile.description,
            status: "ACTIVE",
            isSystem: profile.slug === "administrador",
          },
          create: {
            companyId: company.id,
            name: profile.name,
            slug: profile.slug,
            description: profile.description,
            isSystem: profile.slug === "administrador",
          },
        });

        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        await tx.rolePermission.createMany({
          data: profile.permissions.map((permissionKey) => ({
            roleId: role.id,
            permissionId: permissionByKey.get(permissionKey)!.id,
          })),
          skipDuplicates: true,
        });

        return role;
      }),
    );

    const administratorRole = roles.find((role) => role.slug === "administrador");
    if (!administratorRole) throw new Error("Cargo Administrador não preparado.");

    const user = await tx.user.upsert({
      where: { email: normalizeEmail(adminEmail) },
      update: {
        companyId: company.id,
        name: adminName,
        status: "ACTIVE",
      },
      create: {
        companyId: company.id,
        name: adminName,
        email: normalizeEmail(adminEmail),
        passwordHash,
      },
    });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: administratorRole.id } },
      update: {},
      create: { userId: user.id, roleId: administratorRole.id },
    });

    const adminSector = await tx.sector.findUnique({
      where: { companyId_name: { companyId: company.id, name: "Administração" } },
    });
    if (adminSector) {
      await tx.userSector.upsert({
        where: { userId_sectorId: { userId: user.id, sectorId: adminSector.id } },
        update: {},
        create: { userId: user.id, sectorId: adminSector.id },
      });
    }

    const unit = await tx.unit.upsert({
      where: { companyId_symbol: { companyId: company.id, symbol: "UN" } },
      update: { name: "Unidade", allowsFraction: false, status: "ACTIVE" },
      create: { companyId: company.id, name: "Unidade", symbol: "UN", allowsFraction: false },
    });

    await tx.itemCategory.upsert({
      where: { companyId_name: { companyId: company.id, name: "Geral" } },
      update: { status: "ACTIVE" },
      create: { companyId: company.id, name: "Geral" },
    });

    const [activeUserCount, activeItemCount] = await Promise.all([
      tx.user.count({ where: { companyId: company.id, status: "ACTIVE" } }),
      tx.item.count({ where: { companyId: company.id, status: "ACTIVE" } }),
    ]);

    await Promise.all([
      tx.usageLimit.updateMany({
        where: { companyId: company.id, key: "users" },
        data: { usedValue: activeUserCount },
      }),
      tx.usageLimit.updateMany({
        where: { companyId: company.id, key: "items" },
        data: { usedValue: activeItemCount },
      }),
    ]);

    await tx.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: "system.seed.completed",
        entityType: "company",
        entityId: company.id,
        metadata: {
          defaultUnitId: unit.id,
          planId: plan.id,
          subscriptionId: activeSubscription.id,
          roleProfiles: roleProfiles.map((role) => role.slug),
        },
      },
    });

    if (platformName && platformEmail && platformPasswordHash) {
      const platformUser = await tx.platformUser.upsert({
        where: { email: normalizeEmail(platformEmail) },
        update: {
          name: platformName,
          role: platformRole as "OWNER" | "ADMIN" | "OPERATOR" | "SUPPORT",
          status: "ACTIVE",
        },
        create: {
          name: platformName,
          email: normalizeEmail(platformEmail),
          passwordHash: platformPasswordHash,
          role: platformRole as "OWNER" | "ADMIN" | "OPERATOR" | "SUPPORT",
        },
      });

      await tx.platformAuditLog.create({
        data: {
          platformUserId: platformUser.id,
          action: "platform.seed.completed",
          entityType: "platform_user",
          entityId: platformUser.id,
          metadata: { role: platformUser.role },
        },
      });
    }
  });

  console.log(`Empresa, cargos, permissões e administrador preparados para ${normalizeEmail(adminEmail)}.`);
  if (platformEmail) {
    console.log(`Operador da plataforma preparado para ${normalizeEmail(platformEmail)}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
