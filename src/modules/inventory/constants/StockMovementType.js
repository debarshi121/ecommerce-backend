// src/modules/inventory/constants/StockMovementType.js

module.exports = {
  // Inventory record created for a new product (ProductCreatedConsumer).
  INITIAL: "INITIAL",

  // Available stock increased (restock, PO receipt, manual correction).
  INCREASE: "INCREASE",

  // Available stock decreased (damage, shrinkage, manual correction).
  DECREASE: "DECREASE",

  // Generic signed correction (reconciliation) — same ledger semantics as
  // INCREASE/DECREASE but recorded under its own type for audit clarity.
  ADJUSTMENT: "ADJUSTMENT",

  // available -> reserved, driven by OrderCreatedConsumer.
  RESERVATION: "RESERVATION",

  // reserved -> available, driven by OrderCancelledConsumer or an expiry sweep.
  RELEASE: "RELEASE",

  // reserved -> permanently consumed (available untouched), driven by order confirmation.
  CONFIRMATION: "CONFIRMATION",
};
