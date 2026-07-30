// src/modules/catalog/validators/ChangeProductBrandValidator.js

const { z } = require("zod");

const ChangeProductBrandValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    brandId: z.uuid("Invalid brandId").nullable(),
  }),
});

module.exports = ChangeProductBrandValidator;
