import { describe, expect, it } from "vitest";
import { canAccessCompany } from "./company-access";

describe("canAccessCompany", () => {
  it("permite empresas em trial ou ativas", () => {
    expect(canAccessCompany("TRIAL")).toBe(true);
    expect(canAccessCompany("ACTIVE")).toBe(true);
  });

  it("bloqueia empresas suspensas, canceladas ou desconhecidas", () => {
    expect(canAccessCompany("SUSPENDED")).toBe(false);
    expect(canAccessCompany("CANCELLED")).toBe(false);
    expect(canAccessCompany("INACTIVE")).toBe(false);
  });
});
