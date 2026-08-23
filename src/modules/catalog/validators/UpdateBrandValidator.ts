// src/modules/catalog/validators/UpdateBrandValidator.ts

import { z } from "zod";

export const UpdateBrandValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid brand id"),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Name too short")
        .max(255, "Name too long"),

      logo: z.url("Invalid logo URL").nullable(),

      description: z.string().trim().max(2000).nullable(),
    })
    .partial()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

export type UpdateBrandInput = z.infer<typeof UpdateBrandValidator>;
