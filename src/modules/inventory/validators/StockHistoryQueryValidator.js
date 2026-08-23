// src/modules/inventory/validators/StockHistoryQueryValidator.js

const { z } = require("zod");

const StockMovementType = require("../constants/StockMovementType");

const StockHistoryQueryValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    sortDir: z.enum(["asc", "desc"]).default("desc"),

    movementType: z
      .enum([
        StockMovementType.INITIAL,
        StockMovementType.INCREASE,
        StockMovementType.DECREASE,
        StockMovementType.ADJUSTMENT,
        StockMovementType.RESERVATION,
        StockMovementType.RELEASE,
        StockMovementType.CONFIRMATION,
      ])
      .optional(),
  }),
});

module.exports = StockHistoryQueryValidator;
