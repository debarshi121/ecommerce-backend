// src/modules/catalog/validators/BrandIdParamValidator.ts

import { z } from "zod";

export const BrandIdParamValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid brand id"),
  }),
});

export type BrandIdParamInput = z.infer<typeof BrandIdParamValidator>;
