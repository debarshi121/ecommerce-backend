// src/modules/inventory/validators/DecreaseStockValidator.js

const { z } = require("zod");

const DecreaseStockValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),

  body: z.object({
    quantity: z.number().int().positive("quantity must be a positive integer"),

    reason: z.string().trim().min(1).max(500).optional(),
  }),
});

module.exports = DecreaseStockValidator;
