// src/modules/catalog/routes/category.routes.ts

import { Router } from "express";

import { validate } from "../../../shared/validators/validate";
import type { JwtMiddleware } from "../../identity/middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../../identity/middleware/PermissionMiddleware";

import type { CategoryController } from "../controllers/CategoryController";
import { CategoryIdParamValidator } from "../validators/CategoryIdParamValidator";
import { CreateCategoryValidator } from "../validators/CreateCategoryValidator";
import { UpdateCategoryValidator } from "../validators/UpdateCategoryValidator";

export interface CategoryRouteDependencies {
  categoryController: CategoryController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}

export function categoryRoutes({
  categoryController,
  jwtMiddleware,
  permissionMiddleware,
}: CategoryRouteDependencies): Router {
  const router = Router();

  router.post(
    "/",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("category:create"),

    validate(CreateCategoryValidator),

    categoryController.create.bind(categoryController),
  );

  router.get("/", categoryController.tree.bind(categoryController));

  router.get(
    "/:id",

    validate(CategoryIdParamValidator),

    categoryController.getById.bind(categoryController),
  );

  router.get(
    "/:id/children",

    validate(CategoryIdParamValidator),

    categoryController.children.bind(categoryController),
  );

  router.patch(
    "/:id",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("category:update"),

    validate(UpdateCategoryValidator),

    categoryController.update.bind(categoryController),
  );

  router.delete(
    "/:id",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("category:delete"),

    validate(CategoryIdParamValidator),

    categoryController.delete.bind(categoryController),
  );

  return router;
}
