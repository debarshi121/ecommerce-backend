// src/modules/identity/routes/permissionRoutes.ts

import { Router } from "express";

import type { PermissionController } from "../controllers/PermissionController";
import type { JwtMiddleware } from "../middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../middleware/PermissionMiddleware";

export interface PermissionRouteDependencies {
  permissionController: PermissionController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}

export function permissionRoutes({
  permissionController,
  jwtMiddleware,
  permissionMiddleware,
}: PermissionRouteDependencies): Router {
  const router = Router();

  router.post(
    "/",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("permission:create"),

    permissionController.create.bind(permissionController),
  );

  router.get(
    "/",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionController.list.bind(permissionController),
  );

  return router;
}
