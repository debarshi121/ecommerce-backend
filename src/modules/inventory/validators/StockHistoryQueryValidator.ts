// src/modules/inventory/validators/StockHistoryQueryValidator.ts

import { z } from "zod";

import { StockMovementType } from "../constants/StockMovementType";

export const StockHistoryQueryValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    sortDir: z.enum(["asc", "desc"]).default("desc"),

    movementType: z.enum(StockMovementType).optional(),
  }),
});

export type StockHistoryQueryInput = z.infer<
  typeof StockHistoryQueryValidator
>;
