// src/modules/catalog/routes/brand.routes.js

const express = require("express");

const validate = require("../../../shared/validators/validate");

const CreateBrandValidator = require("../validators/CreateBrandValidator");
const UpdateBrandValidator = require("../validators/UpdateBrandValidator");
const BrandIdParamValidator = require("../validators/BrandIdParamValidator");

module.exports = ({ brandController, jwtMiddleware, permissionMiddleware }) => {
  const router = express.Router();

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
};
