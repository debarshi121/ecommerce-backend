// src/shared/constants/RoutingKeys.ts

export const RoutingKeys = {
  USER_REGISTERED: "user.registered",
  USER_LOGGED_IN: "user.logged_in",
  USER_LOGGED_OUT: "user.logged_out",
  USER_LOGGED_OUT_ALL_DEVICES: "user.logged_out_all_devices",
  AUTH_OTP_REQUIRED: "auth.otp.required",

  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_ARCHIVED: "product.archived",

  ORDER_CREATED: "order.created",
  ORDER_CANCELLED: "order.cancelled",

  INVENTORY_RESERVED: "inventory.reserved",
  INVENTORY_RELEASED: "inventory.released",
  INVENTORY_ADJUSTED: "inventory.adjusted",
  INVENTORY_LOW: "inventory.low",
  INVENTORY_RESERVATION_FAILED: "inventory.reservation.failed",

  DLQ: "dead-letter",
} as const;

export type RoutingKey = (typeof RoutingKeys)[keyof typeof RoutingKeys];
