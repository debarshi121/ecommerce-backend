// src/modules/catalog/validators/CreateCategoryValidator.js

const { z } = require("zod");

const CreateCategoryValidator = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name too short").max(255, "Name too long"),

    parentId: z.uuid("Invalid parentId").optional(),

    description: z.string().trim().max(2000).optional(),
  }),
});

module.exports = CreateCategoryValidator;
