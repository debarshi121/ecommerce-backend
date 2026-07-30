// src/modules/catalog/validators/ProductIdParamValidator.js

const { z } = require("zod");

const ProductIdParamValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),
});

module.exports = ProductIdParamValidator;
