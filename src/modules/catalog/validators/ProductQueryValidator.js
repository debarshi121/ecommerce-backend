// src/modules/catalog/validators/ProductQueryValidator.js

const { z } = require("zod");
const ProductStatus = require("../constants/ProductStatus");

const ProductQueryValidator = z.object({
  query: z.object({
    name: z.string().trim().min(1).max(255).optional(),

    sku: z.string().trim().min(1).max(100).optional(),

    brandId: z.uuid("Invalid brandId").optional(),

    categoryId: z.uuid("Invalid categoryId").optional(),

    status: z
      .enum([
        ProductStatus.DRAFT,
        ProductStatus.ACTIVE,
        ProductStatus.INACTIVE,
        ProductStatus.ARCHIVED,
      ])
      .optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    sortBy: z
      .enum(["name", "sku", "status", "createdAt", "updatedAt"])
      .default("createdAt"),

    sortDir: z.enum(["asc", "desc"]).default("desc"),
  }),
});

module.exports = ProductQueryValidator;
