// src/modules/catalog/validators/CreateCategoryValidator.ts

import { z } from "zod";

export const CreateCategoryValidator = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name too short").max(255, "Name too long"),

    parentId: z.uuid("Invalid parentId").optional(),

    description: z.string().trim().max(2000).optional(),
  }),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryValidator>;
