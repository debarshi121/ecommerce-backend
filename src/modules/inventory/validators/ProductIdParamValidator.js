// src/modules/inventory/validators/ProductIdParamValidator.js

const { z } = require("zod");

const ProductIdParamValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),
});

module.exports = ProductIdParamValidator;
