// src/modules/catalog/validators/ProductIdParamValidator.ts

import { z } from "zod";

export const ProductIdParamValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),
});

export type ProductIdParamInput = z.infer<typeof ProductIdParamValidator>;
