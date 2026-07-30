// src/modules/catalog/validators/AddProductImagesValidator.js

const { z } = require("zod");

const ProductImageInput = z.object({
  imageUrl: z.url("Invalid image URL"),
  altText: z.string().trim().max(255).optional(),
  position: z.number().int().min(0).optional(),
});

const AddProductImagesValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    images: z
      .array(ProductImageInput)
      .min(1, "At least one image is required")
      .max(20, "Too many images"),
  }),
});

module.exports = AddProductImagesValidator;
