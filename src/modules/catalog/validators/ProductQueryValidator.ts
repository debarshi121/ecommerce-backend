// src/modules/catalog/validators/ProductQueryValidator.ts

import { z } from "zod";

import { ProductStatus } from "../constants/ProductStatus";

/**
 * Coerces and defaults the product list query. `validate()` stores the
 * parsed result on `req.validated`, which is what the controller reads —
 * these defaults would be invisible if it read `req.query` directly.
 */
export const ProductQueryValidator = z.object({
  query: z.object({
    name: z.string().trim().min(1).max(255).optional(),

    sku: z.string().trim().min(1).max(100).optional(),

    brandId: z.uuid("Invalid brandId").optional(),

    categoryId: z.uuid("Invalid categoryId").optional(),

    status: z.enum(ProductStatus).optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    sortBy: z
      .enum(["name", "sku", "status", "createdAt", "updatedAt"])
      .default("createdAt"),

    sortDir: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export type ProductQueryInput = z.infer<typeof ProductQueryValidator>;
