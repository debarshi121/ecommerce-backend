// src/modules/catalog/routes/brand.routes.ts

import { Router } from "express";

import { validate } from "../../../shared/validators/validate";
import type { JwtMiddleware } from "../../identity/middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../../identity/middleware/PermissionMiddleware";

import type { BrandController } from "../controllers/BrandController";
import { BrandIdParamValidator } from "../validators/BrandIdParamValidator";
import { CreateBrandValidator } from "../validators/CreateBrandValidator";
import { UpdateBrandValidator } from "../validators/UpdateBrandValidator";

export interface BrandRouteDependencies {
  brandController: BrandController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}

export function brandRoutes({
  brandController,
  jwtMiddleware,
  permissionMiddleware,
}: BrandRouteDependencies): Router {
  const router = Router();

  router.post(
    "/",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("brand:create"),

    validate(CreateBrandValidator),

    brandController.create.bind(brandController),
  );

  router.get("/", brandController.list.bind(brandController));

  router.get(
    "/:id",

    validate(BrandIdParamValidator),

    brandController.getById.bind(brandController),
  );

  router.patch(
    "/:id",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("brand:update"),

    validate(UpdateBrandValidator),

    brandController.update.bind(brandController),
  );

  router.delete(
    "/:id",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("brand:delete"),

    validate(BrandIdParamValidator),

    brandController.delete.bind(brandController),
  );

  return router;
}
