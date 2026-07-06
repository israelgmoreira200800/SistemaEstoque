import { describe, expect, it } from "vitest";
import { ALL_PERMISSION_KEYS } from "../auth/permissions";
import { DEFAULT_ROLE_PROFILES, DEFAULT_SECTORS } from "./defaults";
import { slugifyTenant, subscriptionStatusForCompany } from "./onboarding";

describe("company onboarding defaults", () => {
  it("mantem o administrador com todas as permissoes conhecidas", () => {
    const administrator = DEFAULT_ROLE_PROFILES.find((role) => role.slug === "administrador");

    expect(administrator?.permissions).toEqual(ALL_PERMISSION_KEYS);
    expect(administrator?.permissions).toContain("bom.update");
  });

  it("mantem producao sem permissao para editar ficha tecnica", () => {
    const production = DEFAULT_ROLE_PROFILES.find((role) => role.slug === "producao");

    expect(production?.permissions).toContain("bom.view");
    expect(production?.permissions).not.toContain("bom.update");
    expect(production?.permissions).not.toContain("bom.inactivate");
  });

  it("prepara setores operacionais essenciais", () => {
    expect(DEFAULT_SECTORS).toContain("Administração");
    expect(DEFAULT_SECTORS).toContain("Estoque");
    expect(DEFAULT_SECTORS).toContain("Produção");
  });
});

describe("company onboarding helpers", () => {
  it("normaliza slug de tenant", () => {
    expect(slugifyTenant(" Indústria São João Ltda. ")).toBe("industria-sao-joao-ltda");
  });

  it("mapeia status da empresa para status de assinatura", () => {
    expect(subscriptionStatusForCompany("TRIAL")).toBe("TRIALING");
    expect(subscriptionStatusForCompany("ACTIVE")).toBe("ACTIVE");
    expect(subscriptionStatusForCompany("SUSPENDED")).toBe("SUSPENDED");
  });
});
