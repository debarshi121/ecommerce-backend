// src/modules/identity/routes/permissionRoutes.js

const express = require("express");

module.exports = ({
  permissionController,
  jwtMiddleware,
  permissionMiddleware,
}) => {
  const router = express.Router();

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
};
