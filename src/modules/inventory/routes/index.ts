// src/modules/inventory/routes/index.ts

import type { RouteDefinition } from "../../../shared/types/http";

import type { InventoryRouteDependencies } from "./inventory.routes";
import { inventoryRoutes } from "./inventory.routes";

export type { InventoryRouteDependencies };

export function inventoryModuleRoutes({
  inventoryController,
  jwtMiddleware,
  permissionMiddleware,
}: InventoryRouteDependencies): RouteDefinition[] {
  return [
    {
      path: "/inventory",

      router: inventoryRoutes({
        inventoryController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },
  ];
}
