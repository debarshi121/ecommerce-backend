// src/modules/catalog/validators/CreateBrandValidator.ts

import { z } from "zod";

export const CreateBrandValidator = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Name too short").max(255, "Name too long"),

    logo: z.url("Invalid logo URL").optional(),

    description: z.string().trim().max(2000).optional(),
  }),
});

export type CreateBrandInput = z.infer<typeof CreateBrandValidator>;
