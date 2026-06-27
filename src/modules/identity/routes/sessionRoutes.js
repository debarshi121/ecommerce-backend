// src/modules/identity/routes/sessionRoutes.js

const express = require("express");

module.exports = ({ sessionController, jwtMiddleware }) => {
  const router = express.Router();

  router.post(
    "/refresh",

    sessionController.refreshToken.bind(sessionController),
  );

  router.post(
    "/logout",

    sessionController.logout.bind(sessionController),
  );

  router.post(
    "/logout-all",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    sessionController.logoutAllDevices.bind(sessionController),
  );

  return router;
};
