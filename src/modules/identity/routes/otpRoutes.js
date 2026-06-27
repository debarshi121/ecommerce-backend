// src/modules/identity/routes/otpRoutes.js

const express = require("express");

module.exports = ({ otpController }) => {
  const router = express.Router();

  router.post(
    "/request",

    otpController.requestOtp.bind(otpController),
  );

  return router;
};
