// src/modules/identity/routes/index.js

const authRoutes = require("./authRoutes");

const otpRoutes = require("./otpRoutes");

const sessionRoutes = require("./sessionRoutes");

module.exports = ({
  authController,
  otpController,
  sessionController,
  jwtMiddleware,
}) => {
  return [
    {
      path: "/auth",

      router: authRoutes({
        authController,
      }),
    },

    {
      path: "/otp",

      router: otpRoutes({
        otpController,
      }),
    },

    {
      path: "/session",

      router: sessionRoutes({
        sessionController,
        jwtMiddleware,
      }),
    },
  ];
};
