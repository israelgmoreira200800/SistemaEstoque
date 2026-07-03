import { describe, expect, it } from "vitest";
import { canChangeCustomerOrderStatus } from "./status";

describe("canChangeCustomerOrderStatus", () => {
  it("permite transicoes operacionais esperadas", () => {
    expect(canChangeCustomerOrderStatus("OPEN", "APPROVED")).toBe(true);
    expect(canChangeCustomerOrderStatus("APPROVED", "IN_PRODUCTION")).toBe(true);
    expect(canChangeCustomerOrderStatus("IN_PRODUCTION", "READY")).toBe(true);
    expect(canChangeCustomerOrderStatus("READY", "SHIPPED")).toBe(true);
  });

  it("bloqueia saltos e reversoes de status", () => {
    expect(canChangeCustomerOrderStatus("OPEN", "SHIPPED")).toBe(false);
    expect(canChangeCustomerOrderStatus("READY", "OPEN")).toBe(false);
    expect(canChangeCustomerOrderStatus("SHIPPED", "CANCELED")).toBe(false);
    expect(canChangeCustomerOrderStatus("CANCELED", "OPEN")).toBe(false);
  });
});
