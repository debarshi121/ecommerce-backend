// src/modules/catalog/validators/ReplaceProductImagesValidator.js

const { z } = require("zod");

const ProductImageInput = z.object({
  imageUrl: z.url("Invalid image URL"),
  altText: z.string().trim().max(255).optional(),
  position: z.number().int().min(0).optional(),
});

const ReplaceProductImagesValidator = z.object({
  params: z.object({
    id: z.uuid("Invalid product id"),
  }),

  body: z.object({
    images: z.array(ProductImageInput).max(20, "Too many images"),
  }),
});

module.exports = ReplaceProductImagesValidator;
