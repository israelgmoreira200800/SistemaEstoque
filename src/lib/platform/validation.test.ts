import { describe, expect, it } from "vitest";
import { platformCompanySchema, platformCompanyStatusSchema } from "./validation";

describe("platformCompanySchema", () => {
  it("normaliza campos opcionais de criacao manual", () => {
    const parsed = platformCompanySchema.parse({
      name: "Empresa Cliente",
      slug: "",
      legalName: "",
      tradeName: " Cliente ",
      document: "",
      email: "",
      phone: "",
      timezone: "America/Sao_Paulo",
      status: "TRIAL",
      planId: "plan-1",
      trialDays: "14",
      adminName: "Admin Cliente",
      adminEmail: "admin@cliente.com",
      adminPassword: "SenhaCliente2026!",
    });

    expect(parsed.slug).toBeUndefined();
    expect(parsed.tradeName).toBe("Cliente");
    expect(parsed.email).toBeUndefined();
    expect(parsed.trialDays).toBe(14);
  });

  it("rejeita e-mail e status invalidos", () => {
    expect(
      platformCompanySchema.safeParse({
        name: "Empresa Cliente",
        email: "email-invalido",
        timezone: "America/Sao_Paulo",
        status: "ACTIVE",
        planId: "plan-1",
        adminName: "Admin Cliente",
        adminEmail: "admin@cliente.com",
        adminPassword: "SenhaCliente2026!",
      }).success,
    ).toBe(false);
  });

  it("exige plano e administrador inicial", () => {
    expect(
      platformCompanySchema.safeParse({
        name: "Empresa Cliente",
        timezone: "America/Sao_Paulo",
        status: "TRIAL",
        planId: "",
        adminName: "",
        adminEmail: "admin@cliente.com",
        adminPassword: "curta",
      }).success,
    ).toBe(false);
  });
});

describe("platformCompanyStatusSchema", () => {
  it("aceita operacoes conhecidas de ciclo de vida", () => {
    expect(
      platformCompanyStatusSchema.safeParse({
        companyId: "company-1",
        operation: "suspend",
        reason: "inadimplencia",
      }).success,
    ).toBe(true);
  });
});
