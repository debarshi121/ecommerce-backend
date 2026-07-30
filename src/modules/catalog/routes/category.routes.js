// src/modules/catalog/routes/category.routes.js

const express = require("express");

const validate = require("../../../shared/validators/validate");

const CreateCategoryValidator = require("../validators/CreateCategoryValidator");
const UpdateCategoryValidator = require("../validators/UpdateCategoryValidator");
const CategoryIdParamValidator = require("../validators/CategoryIdParamValidator");

module.exports = ({ categoryController, jwtMiddleware, permissionMiddleware }) => {
  const router = express.Router();

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
};
