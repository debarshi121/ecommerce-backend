// src/modules/catalog/validators/UpdateProductValidator.ts

import { z } from "zod";

export const UpdateProductValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Name too short")
        .max(255, "Name too long"),

      shortDescription: z.string().trim().max(500).nullable(),

      description: z.string().trim().max(20000).nullable(),

      metadata: z.record(z.string(), z.unknown()),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export type UpdateProductInput = z.infer<typeof UpdateProductValidator>;
