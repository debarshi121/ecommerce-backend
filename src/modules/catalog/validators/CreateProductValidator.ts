// src/modules/catalog/validators/CreateProductValidator.ts

import { z } from "zod";

export const ProductImageInputSchema = z.object({
  imageUrl: z.url("Invalid image URL"),
  altText: z.string().trim().max(255).optional(),
  position: z.number().int().min(0).optional(),
});

export const CreateProductValidator = z.object({
  body: z.object({
    sku: z
      .string()
      .trim()
      .min(1, "SKU is required")
      .max(100, "SKU too long")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "SKU may only contain letters, numbers, - and _",
      ),

    name: z.string().trim().min(2, "Name too short").max(255, "Name too long"),

    shortDescription: z.string().trim().max(500).optional(),

    description: z.string().trim().max(20000).optional(),

    categoryId: z.uuid("Invalid categoryId").optional(),

    brandId: z.uuid("Invalid brandId").optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),

    images: z
      .array(ProductImageInputSchema)
      .max(20, "Too many images")
      .optional(),
  }),
});

export type CreateProductInput = z.infer<typeof CreateProductValidator>;
