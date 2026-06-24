import { ALL_PERMISSION_KEYS, type PermissionKey } from "../auth/permissions";

export type DefaultRoleProfile = {
  name: string;
  slug: string;
  description: string;
  permissions: PermissionKey[];
};

export const DEFAULT_ROLE_PROFILES: DefaultRoleProfile[] = [
  {
    name: "Administrador",
    slug: "administrador",
    description: "Acesso total ao sistema.",
    permissions: [...ALL_PERMISSION_KEYS],
  },
  {
    name: "Gerente",
    slug: "gerente",
    description: "Gerencia operacao, pedidos, producao e relatorios, sem alterar usuarios ou permissoes criticas.",
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
    description: "Opera fichas tecnicas e producao.",
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
    description: "Opera entradas, saidas, perdas, ajustes e inventario.",
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
    description: "Consulta informacoes sem alterar dados.",
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

export const DEFAULT_SECTORS = [
  "Administração",
  "Compras",
  "Estoque",
  "Produção",
  "Pedidos",
  "Expedição",
  "Financeiro",
];

export const DEFAULT_PLAN = {
  name: "Manual Starter",
  slug: "manual-starter",
  description: "Plano inicial controlado manualmente pela plataforma.",
  monthlyPriceCents: 0,
  currency: "BRL",
  trialDays: 14,
};

export const DEFAULT_PLAN_FEATURES = [
  { key: "users", name: "Usuarios", value: { limit: 50 } },
  { key: "items", name: "Itens", value: { limit: 1000 } },
  { key: "production", name: "Modulo de producao", value: { enabled: true } },
  { key: "audit", name: "Auditoria", value: { enabled: true } },
  { key: "support", name: "Suporte", value: { level: "standard" } },
];

export const DEFAULT_USAGE_LIMITS = [
  { key: "users", limitValue: 50, unit: "usuarios" },
  { key: "items", limitValue: 1000, unit: "itens" },
  { key: "exports", limitValue: 100, unit: "exportacoes/mes" },
];
