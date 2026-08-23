// src/shared/constants/EventNames.ts

export const EventNames = {
  USER_REGISTERED: "UserRegistered",
  USER_LOGGED_IN: "UserLoggedIn",
  USER_LOGGED_OUT: "UserLoggedOut",
  USER_LOGGED_OUT_ALL_DEVICES: "UserLoggedOutAllDevices",
  AUTH_OTP_REQUIRED: "AuthOtpRequired",

  PRODUCT_CREATED: "ProductCreated",
  PRODUCT_UPDATED: "ProductUpdated",
  PRODUCT_ARCHIVED: "ProductArchived",

  // Consumed from the (future) Ordering module.
  ORDER_CREATED: "OrderCreated",
  ORDER_CANCELLED: "OrderCancelled",

  INVENTORY_RESERVED: "InventoryReserved",
  INVENTORY_RELEASED: "InventoryReleased",
  INVENTORY_ADJUSTED: "InventoryAdjusted",
  INVENTORY_LOW: "InventoryLow",
  INVENTORY_RESERVATION_FAILED: "InventoryReservationFailed",
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
