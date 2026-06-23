import { describe, expect, it } from "vitest";
import { hasPermission, resolveEffectivePermissions } from "./permissions";

describe("permissões", () => {
  it("autoriza apenas a permissão efetiva concedida", () => {
    const granted = new Set(["order.create"]);

    expect(hasPermission(granted, "order.create")).toBe(true);
    expect(hasPermission(granted, "stock.adjust")).toBe(false);
  });

  it("nega tudo quando o usuário está bloqueado", () => {
    const { permissions } = resolveEffectivePermissions({
      userStatus: "BLOCKED",
      rolePermissions: ["permission.manage", "stock.view"],
      userOverrides: [{ key: "dashboard.view", effect: "GRANT" }],
    });

    expect(permissions.size).toBe(0);
  });

  it("negação individual vence cargo e concessão individual", () => {
    const { permissions } = resolveEffectivePermissions({
      userStatus: "ACTIVE",
      rolePermissions: ["stock.view", "stock.adjust"],
      userOverrides: [
        { key: "stock.adjust", effect: "DENY" },
        { key: "stock.adjust", effect: "GRANT" },
        { key: "order.create", effect: "GRANT" },
      ],
    });

    expect(permissions.has("stock.view")).toBe(true);
    expect(permissions.has("stock.adjust")).toBe(false);
    expect(permissions.has("order.create")).toBe(true);
  });

  it("ausência de cargo e override mantém acesso negado", () => {
    const { permissions } = resolveEffectivePermissions({
      userStatus: "ACTIVE",
      rolePermissions: [],
      userOverrides: [],
    });

    expect(permissions.has("dashboard.view")).toBe(false);
  });
});

