// src/modules/inventory/validators/DecreaseStockValidator.ts

import { z } from "zod";

export const DecreaseStockValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),

  body: z.object({
    quantity: z.number().int().positive("quantity must be a positive integer"),

    reason: z.string().trim().min(1).max(500).optional(),
  }),
});

export type DecreaseStockInput = z.infer<typeof DecreaseStockValidator>;
