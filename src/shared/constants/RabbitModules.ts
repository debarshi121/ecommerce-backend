// src/shared/constants/RabbitModules.ts
//
// One logical module == one RabbitMQ exchange (plus its retry/DLQ pair).
// See MessagingModule for how these names expand into topology names.

export const RabbitModules = {
  IDENTITY: "identity",
  CATALOG: "catalog",
  INVENTORY: "inventory",
  CART: "cart",
  ORDERING: "ordering",
  PAYMENT: "payment",
  NOTIFICATION: "notification",
  REPORTING: "reporting",
} as const;

export type RabbitModule = (typeof RabbitModules)[keyof typeof RabbitModules];
