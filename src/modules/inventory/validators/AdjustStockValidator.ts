// src/modules/inventory/validators/AdjustStockValidator.ts

import { z } from "zod";

export const AdjustStockValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),

  body: z.object({
    quantityDelta: z
      .number()
      .int("quantityDelta must be an integer")
      .refine((value) => value !== 0, "quantityDelta must not be zero"),

    reason: z.string().trim().min(1).max(500).optional(),
  }),
});

export type AdjustStockInput = z.infer<typeof AdjustStockValidator>;
