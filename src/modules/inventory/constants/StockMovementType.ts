// src/modules/inventory/constants/StockMovementType.ts
//
// Mirrors chk_stock_movements_type in migration 006. Every row in
// stock_movements is one of these, and the ledger is append-only.

export const StockMovementType = {
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
} as const;

export type StockMovementTypeValue =
  (typeof StockMovementType)[keyof typeof StockMovementType];
