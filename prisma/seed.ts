import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, normalizeEmail } from "../src/lib/auth/password";
import { ALL_PERMISSION_KEYS, PERMISSIONS, type PermissionDefinition, type PermissionKey } from "../src/lib/auth/permissions";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
      "recipe.view",
      "recipe.create",
      "recipe.update",
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
      "recipe.view",
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

async function main() {
  const companyName = process.env.SEED_COMPANY_NAME;
  const adminName = process.env.SEED_ADMIN_NAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    console.log("Seed administrativo ignorado: variáveis SEED_* incompletas.");
    return;
  }

  if (adminPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD deve possuir pelo menos 12 caracteres.");
  }

  const passwordHash = await hashPassword(adminPassword);

  await prisma.$transaction(async (tx) => {
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

    const company = await tx.company.upsert({
      where: { slug: slugify(companyName) },
      update: { name: companyName, status: "ACTIVE" },
      create: { name: companyName, slug: slugify(companyName) },
    });

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

    await tx.auditLog.create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: "system.seed.completed",
        entityType: "company",
        entityId: company.id,
        metadata: { defaultUnitId: unit.id, roleProfiles: roleProfiles.map((role) => role.slug) },
      },
    });
  });

  console.log(`Empresa, cargos, permissões e administrador preparados para ${normalizeEmail(adminEmail)}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
