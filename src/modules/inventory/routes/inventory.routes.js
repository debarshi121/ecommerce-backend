// src/modules/inventory/routes/inventory.routes.js

const express = require("express");

const validate = require("../../../shared/validators/validate");

const ProductIdParamValidator = require("../validators/ProductIdParamValidator");
const AdjustStockValidator = require("../validators/AdjustStockValidator");
const IncreaseStockValidator = require("../validators/IncreaseStockValidator");
const DecreaseStockValidator = require("../validators/DecreaseStockValidator");
const StockHistoryQueryValidator = require("../validators/StockHistoryQueryValidator");
const ReservationsQueryValidator = require("../validators/ReservationsQueryValidator");

// Reservation state is event-driven only (ProductCreated/OrderCreated/
// OrderCancelled) — there is deliberately no POST /reserve or /release route
// here. Only direct stock corrections (adjust/increase/decrease) and reads
// are exposed over HTTP.
module.exports = ({ inventoryController, jwtMiddleware, permissionMiddleware }) => {
  const router = express.Router();

  router.get(
    "/:productId",

    validate(ProductIdParamValidator),

    inventoryController.getByProduct.bind(inventoryController),
  );

  router.patch(
    "/:productId/adjust",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("inventory:adjust"),

    validate(AdjustStockValidator),

    inventoryController.adjust.bind(inventoryController),
  );

  router.post(
    "/:productId/increase",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("inventory:increase"),

    validate(IncreaseStockValidator),

    inventoryController.increase.bind(inventoryController),
  );

  router.post(
    "/:productId/decrease",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("inventory:decrease"),

    validate(DecreaseStockValidator),

    inventoryController.decrease.bind(inventoryController),
  );

  router.get(
    "/:productId/history",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("inventory:read"),

    validate(StockHistoryQueryValidator),

    inventoryController.history.bind(inventoryController),
  );

  router.get(
    "/:productId/reservations",

    jwtMiddleware.authenticate.bind(jwtMiddleware),

    permissionMiddleware.require("inventory:read"),

    validate(ReservationsQueryValidator),

    inventoryController.reservations.bind(inventoryController),
  );

  return router;
};
