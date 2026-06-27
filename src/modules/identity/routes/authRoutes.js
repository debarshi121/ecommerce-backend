// src/modules/identity/routes/authRoutes.js

const express = require("express");

module.exports = ({ authController }) => {
  const router = express.Router();

  router.post(
    "/register",

    authController.register.bind(authController),
  );

  router.post(
    "/login",

    authController.login.bind(authController),
  );

  return router;
};
