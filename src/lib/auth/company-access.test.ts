import { describe, expect, it } from "vitest";
import { canAccessCompany } from "./company-access";

describe("canAccessCompany", () => {
  it("permite empresas em trial ou ativas", () => {
    expect(canAccessCompany("TRIAL")).toBe(true);
    expect(canAccessCompany("ACTIVE")).toBe(true);
    expect(canAccessCompany("TRIAL", "TRIALING")).toBe(true);
    expect(canAccessCompany("ACTIVE", "ACTIVE")).toBe(true);
  });

  it("bloqueia empresas suspensas, canceladas ou desconhecidas", () => {
    expect(canAccessCompany("SUSPENDED")).toBe(false);
    expect(canAccessCompany("CANCELLED")).toBe(false);
    expect(canAccessCompany("INACTIVE")).toBe(false);
  });

  it("bloqueia quando a assinatura conhecida nao esta ativa", () => {
    expect(canAccessCompany("ACTIVE", "SUSPENDED")).toBe(false);
    expect(canAccessCompany("ACTIVE", "CANCELLED")).toBe(false);
    expect(canAccessCompany("ACTIVE", "EXPIRED")).toBe(false);
  });
});
