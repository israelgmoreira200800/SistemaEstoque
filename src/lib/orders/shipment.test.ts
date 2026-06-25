import { describe, expect, it } from "vitest";

describe("canDispatchCustomerOrder", () => {
  it("permite expedir pedidos ainda nao finalizados", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { canDispatchCustomerOrder } = await import("./shipment");

    expect(canDispatchCustomerOrder("OPEN")).toBe(true);
    expect(canDispatchCustomerOrder("APPROVED")).toBe(true);
    expect(canDispatchCustomerOrder("READY")).toBe(true);
  });

  it("bloqueia pedidos cancelados ou ja expedidos", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
    const { canDispatchCustomerOrder } = await import("./shipment");

    expect(canDispatchCustomerOrder("CANCELED")).toBe(false);
    expect(canDispatchCustomerOrder("SHIPPED")).toBe(false);
  });
});
