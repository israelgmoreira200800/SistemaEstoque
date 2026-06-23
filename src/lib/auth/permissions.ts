export type PermissionDefinition = {
  key: string;
  module: string;
  action: string;
  name: string;
  description?: string;
};

export const PERMISSIONS = [
  { key: "dashboard.view", module: "dashboard", action: "view", name: "Ver dashboard" },

  { key: "item.view", module: "item", action: "view", name: "Ver itens" },
  { key: "item.create", module: "item", action: "create", name: "Criar itens" },
  { key: "item.update", module: "item", action: "update", name: "Editar itens" },
  { key: "item.inactivate", module: "item", action: "inactivate", name: "Inativar itens" },
  { key: "item.view_cost", module: "item", action: "view_cost", name: "Ver custos dos itens" },
  { key: "item.update_cost", module: "item", action: "update_cost", name: "Editar custos dos itens" },

  { key: "category.view", module: "category", action: "view", name: "Ver categorias" },
  { key: "category.create", module: "category", action: "create", name: "Criar categorias" },
  { key: "category.update", module: "category", action: "update", name: "Editar categorias" },
  { key: "category.inactivate", module: "category", action: "inactivate", name: "Inativar categorias" },

  { key: "unit.view", module: "unit", action: "view", name: "Ver unidades de medida" },
  { key: "unit.create", module: "unit", action: "create", name: "Criar unidades de medida" },
  { key: "unit.update", module: "unit", action: "update", name: "Editar unidades de medida" },
  { key: "unit.inactivate", module: "unit", action: "inactivate", name: "Inativar unidades de medida" },

  { key: "recipe.view", module: "recipe", action: "view", name: "Ver fichas técnicas" },
  { key: "recipe.create", module: "recipe", action: "create", name: "Criar fichas técnicas" },
  { key: "recipe.update", module: "recipe", action: "update", name: "Editar fichas técnicas" },
  { key: "recipe.inactivate", module: "recipe", action: "inactivate", name: "Inativar fichas técnicas" },

  { key: "stock.view", module: "stock", action: "view", name: "Ver estoque" },
  { key: "stock.entry", module: "stock", action: "entry", name: "Registrar entradas" },
  { key: "stock.exit", module: "stock", action: "exit", name: "Registrar saídas" },
  { key: "stock.loss", module: "stock", action: "loss", name: "Registrar perdas" },
  { key: "stock.adjust", module: "stock", action: "adjust", name: "Ajustar estoque" },
  { key: "stock.adjust_approve", module: "stock", action: "adjust_approve", name: "Aprovar ajustes de estoque" },
  { key: "stock.inventory", module: "stock", action: "inventory", name: "Fazer inventário" },

  { key: "order.view", module: "order", action: "view", name: "Ver pedidos" },
  { key: "order.create", module: "order", action: "create", name: "Criar pedidos" },
  { key: "order.update", module: "order", action: "update", name: "Editar pedidos" },
  { key: "order.cancel", module: "order", action: "cancel", name: "Cancelar pedidos" },
  { key: "order.approve", module: "order", action: "approve", name: "Aprovar pedidos" },
  { key: "order.change_status", module: "order", action: "change_status", name: "Alterar status de pedidos" },

  { key: "production.view", module: "production", action: "view", name: "Ver produção" },
  { key: "production.create", module: "production", action: "create", name: "Criar produção" },
  { key: "production.start", module: "production", action: "start", name: "Iniciar produção" },
  { key: "production.finish", module: "production", action: "finish", name: "Finalizar produção" },
  { key: "production.cancel", module: "production", action: "cancel", name: "Cancelar produção" },
  { key: "production.register_loss", module: "production", action: "register_loss", name: "Registrar perda na produção" },
  { key: "production.approve", module: "production", action: "approve", name: "Aprovar produção" },

  { key: "shipment.view", module: "shipment", action: "view", name: "Ver expedição" },
  { key: "shipment.separate", module: "shipment", action: "separate", name: "Separar pedido" },
  { key: "shipment.dispatch", module: "shipment", action: "dispatch", name: "Expedir pedido" },

  { key: "report.view", module: "report", action: "view", name: "Ver relatórios" },
  { key: "report.export", module: "report", action: "export", name: "Exportar relatórios" },
  { key: "report.view_financial", module: "report", action: "view_financial", name: "Ver dados financeiros" },

  { key: "user.view", module: "user", action: "view", name: "Ver usuários" },
  { key: "user.create", module: "user", action: "create", name: "Criar usuários" },
  { key: "user.update", module: "user", action: "update", name: "Editar usuários" },
  { key: "user.block", module: "user", action: "block", name: "Bloquear usuários" },
  { key: "user.reset_password", module: "user", action: "reset_password", name: "Redefinir senha de usuários" },

  { key: "role.view", module: "role", action: "view", name: "Ver cargos" },
  { key: "role.create", module: "role", action: "create", name: "Criar cargos" },
  { key: "role.update", module: "role", action: "update", name: "Editar cargos" },
  { key: "role.duplicate", module: "role", action: "duplicate", name: "Duplicar cargos" },
  { key: "role.inactivate", module: "role", action: "inactivate", name: "Inativar cargos" },

  { key: "permission.manage", module: "permission", action: "manage", name: "Gerenciar permissões" },
  { key: "settings.manage", module: "settings", action: "manage", name: "Gerenciar configurações" },
  { key: "audit.view", module: "audit", action: "view", name: "Ver auditoria" },
] as const satisfies readonly PermissionDefinition[];

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key) as PermissionKey[];

export const ADMINISTRATIVE_PERMISSIONS = [
  "user.view",
  "user.create",
  "user.update",
  "user.block",
  "user.reset_password",
  "role.view",
  "role.create",
  "role.update",
  "role.duplicate",
  "role.inactivate",
  "permission.manage",
  "settings.manage",
  "audit.view",
] as const satisfies readonly PermissionKey[];

export type PermissionOverrideInput = {
  key: string;
  effect: "GRANT" | "DENY";
};

export type PermissionResolutionInput = {
  userStatus?: "ACTIVE" | "BLOCKED";
  rolePermissions: Iterable<string>;
  userOverrides?: Iterable<PermissionOverrideInput>;
};

export function resolveEffectivePermissions(input: PermissionResolutionInput) {
  const rolePermissions = new Set(input.rolePermissions);
  const grants = new Set<string>();
  const denies = new Set<string>();

  for (const override of input.userOverrides ?? []) {
    if (override.effect === "DENY") denies.add(override.key);
    if (override.effect === "GRANT") grants.add(override.key);
  }

  const permissions = new Set<string>();
  if (input.userStatus === "BLOCKED") {
    return { permissions, grants, denies };
  }

  for (const key of rolePermissions) {
    if (!denies.has(key)) permissions.add(key);
  }

  for (const key of grants) {
    if (!denies.has(key)) permissions.add(key);
  }

  return { permissions, grants, denies };
}

export function hasPermission(
  grantedPermissions: ReadonlySet<string>,
  requiredPermission: PermissionKey,
) {
  return grantedPermissions.has(requiredPermission);
}

export function permissionModuleLabel(module: string) {
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    item: "Itens",
    category: "Categorias",
    unit: "Unidades",
    recipe: "Fichas técnicas",
    stock: "Estoque",
    order: "Pedidos",
    production: "Produção",
    shipment: "Expedição",
    report: "Relatórios",
    user: "Usuários",
    role: "Cargos",
    permission: "Permissões",
    settings: "Configurações",
    audit: "Auditoria",
  };

  return labels[module] ?? module;
}

