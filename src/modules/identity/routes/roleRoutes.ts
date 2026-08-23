// src/modules/identity/routes/roleRoutes.ts

import { Router } from "express";

import type { RoleController } from "../controllers/RoleController";
import type { JwtMiddleware } from "../middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../middleware/PermissionMiddleware";

export interface RoleRouteDependencies {
  roleController: RoleController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}

export function roleRoutes({
  roleController,
  jwtMiddleware,
  permissionMiddleware,
}: RoleRouteDependencies): Router {
  const router = Router();

  router.post(
    "/",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("role:create"),

    roleController.create.bind(roleController),
  );

  router.delete(
    "/:id",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("role:delete"),

    roleController.delete.bind(roleController),
  );

  router.post(
    "/:roleId/permissions",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("role:update"),

    roleController.addPermission.bind(roleController),
  );

  return router;
}
