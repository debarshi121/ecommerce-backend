// src/modules/catalog/validators/BrandIdParamValidator.js

const { z } = require("zod");

const BrandIdParamValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid brand id"),
  }),
});

module.exports = BrandIdParamValidator;
