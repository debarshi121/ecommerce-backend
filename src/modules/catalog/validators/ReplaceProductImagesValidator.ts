// src/modules/catalog/validators/ReplaceProductImagesValidator.ts

import { z } from "zod";

import { ProductImageInputSchema } from "./CreateProductValidator";

export const ReplaceProductImagesValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    images: z.array(ProductImageInputSchema).max(20, "Too many images"),
  }),
});

export type ReplaceProductImagesInput = z.infer<
  typeof ReplaceProductImagesValidator
>;
