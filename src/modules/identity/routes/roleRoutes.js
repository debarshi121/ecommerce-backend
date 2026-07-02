// src/modules/identity/routes/roleRoutes.js

const express = require("express");

module.exports = ({ roleController, jwtMiddleware, permissionMiddleware }) => {
  const router = express.Router();

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
};
