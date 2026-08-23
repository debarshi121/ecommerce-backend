// src/modules/catalog/validators/CategoryIdParamValidator.ts

import { z } from "zod";

export const CategoryIdParamValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid category id"),
  }),
});

export type CategoryIdParamInput = z.infer<typeof CategoryIdParamValidator>;
