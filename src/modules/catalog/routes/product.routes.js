// src/modules/catalog/routes/product.routes.js

const express = require("express");

const validate = require("../../../shared/validators/validate");

const CreateProductValidator = require("../validators/CreateProductValidator");
const UpdateProductValidator = require("../validators/UpdateProductValidator");
const ProductIdParamValidator = require("../validators/ProductIdParamValidator");
const ProductQueryValidator = require("../validators/ProductQueryValidator");
const ChangeProductCategoryValidator = require("../validators/ChangeProductCategoryValidator");
const ChangeProductBrandValidator = require("../validators/ChangeProductBrandValidator");
const AddProductImagesValidator = require("../validators/AddProductImagesValidator");
const ReplaceProductImagesValidator = require("../validators/ReplaceProductImagesValidator");
const RemoveProductImageValidator = require("../validators/RemoveProductImageValidator");

module.exports = ({ productController, jwtMiddleware, permissionMiddleware }) => {
  const router = express.Router();

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

  router.get("/slug/:slug", productController.getBySlug.bind(productController));

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
};
