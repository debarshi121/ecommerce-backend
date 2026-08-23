// src/modules/inventory/constants/ReservationStatus.js

module.exports = {
  // Reservation row created, stock not yet allocated. Exists as its own
  // persisted state (rather than jumping straight to RESERVED/FAILED) so
  // every reservation attempt — including ones that fail — leaves an audit
  // trail of when it was requested vs when it was decided.
  PENDING: "PENDING",

  // Stock was successfully moved from available to reserved for this order.
  // The reservation is holding that stock pending payment/fulfillment.
  RESERVED: "RESERVED",

  // A RESERVED reservation was explicitly cancelled (OrderCancelled) before
  // confirmation; its stock has been returned to available.
  RELEASED: "RELEASED",

  // The order was fulfilled (payment/fulfillment succeeded). The reserved
  // quantity is permanently consumed — it is NOT returned to available.
  // Terminal success state.
  CONFIRMED: "CONFIRMED",

  // A RESERVED reservation's TTL passed with no confirmation or explicit
  // cancellation. System-driven analog of RELEASED — stock is returned to
  // available by the expiry sweep instead of an explicit event.
  EXPIRED: "EXPIRED",

  // The reservation attempt could not allocate stock (insufficient quantity,
  // or the product has no inventory record). No stock was ever moved.
  // Recorded for audit/observability and to drive InventoryReservationFailed.
  FAILED: "FAILED",

  // Minutes a RESERVED reservation holds stock before it becomes eligible
  // for the expiry sweep (ReservationRepository.findPendingExpired).
  DEFAULT_TTL_MINUTES: Number(process.env.INVENTORY_RESERVATION_TTL_MINUTES || 30),

  ALLOWED_TRANSITIONS: {
    PENDING: ["RESERVED", "FAILED"],
    RESERVED: ["CONFIRMED", "RELEASED", "EXPIRED"],
    RELEASED: [],
    CONFIRMED: [],
    EXPIRED: [],
    FAILED: [],
  },
};
