// src/modules/catalog/routes/index.ts

import type { RouteDefinition } from "../../../shared/types/http";

import type { BrandRouteDependencies } from "./brand.routes";
import { brandRoutes } from "./brand.routes";
import type { CategoryRouteDependencies } from "./category.routes";
import { categoryRoutes } from "./category.routes";
import type { ProductRouteDependencies } from "./product.routes";
import { productRoutes } from "./product.routes";

export type CatalogRouteDependencies = ProductRouteDependencies &
  CategoryRouteDependencies &
  BrandRouteDependencies;

export function catalogRoutes({
  productController,
  categoryController,
  brandController,
  jwtMiddleware,
  permissionMiddleware,
}: CatalogRouteDependencies): RouteDefinition[] {
  return [
    {
      path: "/products",

      router: productRoutes({
        productController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },

    {
      path: "/categories",

      router: categoryRoutes({
        categoryController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },

    {
      path: "/brands",

      router: brandRoutes({
        brandController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },
  ];
}
