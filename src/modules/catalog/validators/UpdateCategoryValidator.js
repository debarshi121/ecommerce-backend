// src/modules/catalog/validators/UpdateCategoryValidator.js

const { z } = require("zod");

const UpdateCategoryValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid category id"),
  }),

  body: z
    .object({
      name: z.string().trim().min(2, "Name too short").max(255, "Name too long"),

      parentId: z.uuid("Invalid parentId").nullable(),

      description: z.string().trim().max(2000).nullable(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

module.exports = UpdateCategoryValidator;
