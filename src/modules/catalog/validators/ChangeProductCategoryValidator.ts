// src/modules/catalog/validators/ChangeProductCategoryValidator.ts

import { z } from "zod";

export const ChangeProductCategoryValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    categoryId: z.uuid("Invalid categoryId").nullable(),
  }),
});

export type ChangeProductCategoryInput = z.infer<
  typeof ChangeProductCategoryValidator
>;
