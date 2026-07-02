// src/modules/identity/routes/index.js

const authRoutes = require("./authRoutes");

const otpRoutes = require("./otpRoutes");

const sessionRoutes = require("./sessionRoutes");

const roleRoutes = require("./roleRoutes");

const permissionRoutes = require("./permissionRoutes");

module.exports = ({
  authController,
  otpController,
  sessionController,
  roleController,
  permissionController,
  jwtMiddleware,
  permissionMiddleware,
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

    {
      path: "/role",

      router: roleRoutes({
        roleController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },

    {
      path: "/permission",

      router: permissionRoutes({
        permissionController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },
  ];
};
