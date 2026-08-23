// src/modules/catalog/validators/ChangeProductBrandValidator.ts

import { z } from "zod";

export const ChangeProductBrandValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    brandId: z.uuid("Invalid brandId").nullable(),
  }),
});

export type ChangeProductBrandInput = z.infer<
  typeof ChangeProductBrandValidator
>;
