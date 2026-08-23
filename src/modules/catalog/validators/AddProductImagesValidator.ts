// src/modules/catalog/validators/AddProductImagesValidator.ts

import { z } from "zod";

import { ProductImageInputSchema } from "./CreateProductValidator";

export const AddProductImagesValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    images: z
      .array(ProductImageInputSchema)
      .min(1, "At least one image is required")
      .max(20, "Too many images"),
  }),
});

export type AddProductImagesInput = z.infer<typeof AddProductImagesValidator>;
