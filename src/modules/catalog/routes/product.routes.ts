// src/modules/catalog/routes/product.routes.ts

import { Router } from "express";

import { validate } from "../../../shared/validators/validate";
import type { JwtMiddleware } from "../../identity/middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../../identity/middleware/PermissionMiddleware";

import type { ProductController } from "../controllers/ProductController";
import { AddProductImagesValidator } from "../validators/AddProductImagesValidator";
import { ChangeProductBrandValidator } from "../validators/ChangeProductBrandValidator";
import { ChangeProductCategoryValidator } from "../validators/ChangeProductCategoryValidator";
import { CreateProductValidator } from "../validators/CreateProductValidator";
import { ProductIdParamValidator } from "../validators/ProductIdParamValidator";
import { ProductQueryValidator } from "../validators/ProductQueryValidator";
import { RemoveProductImageValidator } from "../validators/RemoveProductImageValidator";
import { ReplaceProductImagesValidator } from "../validators/ReplaceProductImagesValidator";
import { UpdateProductValidator } from "../validators/UpdateProductValidator";

export interface ProductRouteDependencies {
  productController: ProductController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}

export function productRoutes({
  productController,
  jwtMiddleware,
  permissionMiddleware,
}: ProductRouteDependencies): Router {
  const router = Router();

  router.post(
    "/",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:create"),

    validate(CreateProductValidator),

    productController.create.bind(productController),
  );

  router.get(
    "/",

    validate(ProductQueryValidator),

    productController.list.bind(productController),
  );

  router.get(
    "/slug/:slug",
    productController.getBySlug.bind(productController),
  );

  router.get(
    "/:id",

    validate(ProductIdParamValidator),

    productController.getById.bind(productController),
  );

  router.patch(
    "/:id",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:update"),

    validate(UpdateProductValidator),

    productController.update.bind(productController),
  );

  router.patch(
    "/:id/category",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:update"),

    validate(ChangeProductCategoryValidator),

    productController.changeCategory.bind(productController),
  );

  router.patch(
    "/:id/brand",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:update"),

    validate(ChangeProductBrandValidator),

    productController.changeBrand.bind(productController),
  );

  router.post(
    "/:id/archive",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:archive"),

    validate(ProductIdParamValidator),

    productController.archive.bind(productController),
  );

  router.post(
    "/:id/activate",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:activate"),

    validate(ProductIdParamValidator),

    productController.activate.bind(productController),
  );

  router.post(
    "/:id/deactivate",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:update"),

    validate(ProductIdParamValidator),

    productController.deactivate.bind(productController),
  );

  router.post(
    "/:id/images",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:update"),

    validate(AddProductImagesValidator),

    productController.addImages.bind(productController),
  );

  router.put(
    "/:id/images",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:update"),

    validate(ReplaceProductImagesValidator),

    productController.replaceImages.bind(productController),
  );

  router.delete(
    "/:id/images/:imageId",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("product:update"),

    validate(RemoveProductImageValidator),

    productController.removeImage.bind(productController),
  );

  return router;
}
