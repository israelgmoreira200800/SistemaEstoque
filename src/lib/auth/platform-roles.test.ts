import { describe, expect, it } from "vitest";

describe("platformRoleCanAccess", () => {
  it("permite gestao de empresas apenas para owner e admin", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { PLATFORM_COMPANY_MANAGEMENT_ROLES, platformRoleCanAccess } = await import("./platform-roles");

    expect(platformRoleCanAccess("OWNER", PLATFORM_COMPANY_MANAGEMENT_ROLES)).toBe(true);
    expect(platformRoleCanAccess("ADMIN", PLATFORM_COMPANY_MANAGEMENT_ROLES)).toBe(true);
    expect(platformRoleCanAccess("OPERATOR", PLATFORM_COMPANY_MANAGEMENT_ROLES)).toBe(false);
    expect(platformRoleCanAccess("SUPPORT", PLATFORM_COMPANY_MANAGEMENT_ROLES)).toBe(false);
  });
});
