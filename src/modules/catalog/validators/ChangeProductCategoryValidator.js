// src/modules/catalog/validators/ChangeProductCategoryValidator.js

const { z } = require("zod");

const ChangeProductCategoryValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    categoryId: z.uuid("Invalid categoryId").nullable(),
  }),
});

module.exports = ChangeProductCategoryValidator;
