// src/app/registerRoutes.ts

import type { Express } from "express";

import { catalogRoutes } from "../modules/catalog/routes";
import { identityRoutes } from "../modules/identity/routes";
import { inventoryModuleRoutes } from "../modules/inventory/routes";
import type { RouteDefinition } from "../shared/types/http";

import type { AppContainer } from "../bootstrap/container";

const API_PREFIX = "/api/v1";

/**
 * Mounts every module's route groups under the shared API prefix. Adding a
 * module is one import plus one spread — nothing else in the app changes.
 */
export function registerRoutes(app: Express, dependencies: AppContainer): void {
  const routes: RouteDefinition[] = [
    ...identityRoutes(dependencies),
    ...catalogRoutes(dependencies),
    ...inventoryModuleRoutes(dependencies),
  ];

  routes.forEach((route) => {
    app.use(`${API_PREFIX}${route.path}`, route.router);
  });
}
