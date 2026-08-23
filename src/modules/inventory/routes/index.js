// src/modules/inventory/routes/index.js

const inventoryRoutes = require("./inventory.routes");

module.exports = ({ inventoryController, jwtMiddleware, permissionMiddleware }) => {
  return [
    {
      path: "/inventory",

      router: inventoryRoutes({
        inventoryController,
        jwtMiddleware,
        permissionMiddleware,
      }),
    },
  ];
};
