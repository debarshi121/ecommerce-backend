// src/modules/identity/routes/authRoutes.js

const express = require("express");

const validate = require("../../../shared/validators/validate");
const RegisterValidator = require("../validators/RegisterValidator");
const LoginValidator = require("../validators/LoginValidator");

module.exports = ({ authController }) => {
  const router = express.Router();

  router.post(
    "/register",

    validate(RegisterValidator),

    authController.register.bind(authController),
  );

  router.post(
    "/login",

    validate(LoginValidator),

    authController.login.bind(authController),
  );

  return router;
};
