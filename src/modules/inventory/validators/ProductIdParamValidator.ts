// src/modules/inventory/validators/ProductIdParamValidator.ts

import { z } from "zod";

export const ProductIdParamValidator = z.object({
  params: z.object({
    productId: z.uuid("Invalid product id"),
  }),
});

export type ProductIdParamInput = z.infer<typeof ProductIdParamValidator>;
