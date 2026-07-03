import type { CustomerOrderStatus } from "@/generated/prisma/enums";

const ORDER_STATUS_TRANSITIONS = {
  OPEN: ["APPROVED", "CANCELED"],
  APPROVED: ["IN_PRODUCTION", "READY", "SHIPPED", "CANCELED"],
  IN_PRODUCTION: ["READY", "CANCELED"],
  READY: ["SHIPPED", "CANCELED"],
  SHIPPED: [],
  CANCELED: [],
} as const satisfies Record<CustomerOrderStatus, readonly CustomerOrderStatus[]>;

export function canChangeCustomerOrderStatus(from: CustomerOrderStatus, to: CustomerOrderStatus) {
  if (from === to) return true;
  return (ORDER_STATUS_TRANSITIONS[from] as readonly CustomerOrderStatus[]).includes(to);
}

export function invalidOrderStatusTransitionMessage(from: CustomerOrderStatus, to: CustomerOrderStatus) {
  return `Transicao de status invalida: ${from} -> ${to}.`;
}
