// src/modules/catalog/validators/CategoryIdParamValidator.js

const { z } = require("zod");

const CategoryIdParamValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid category id"),
  }),
});

module.exports = CategoryIdParamValidator;
