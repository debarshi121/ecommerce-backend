// src/modules/catalog/validators/CreateBrandValidator.js

const { z } = require("zod");

const CreateBrandValidator = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name too short").max(255, "Name too long"),

    logo: z.url("Invalid logo URL").optional(),

    description: z.string().trim().max(2000).optional(),
  }),
});

module.exports = CreateBrandValidator;
