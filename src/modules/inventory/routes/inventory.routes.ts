// src/modules/inventory/routes/inventory.routes.ts

import { Router } from "express";

import { validate } from "../../../shared/validators/validate";
import type { JwtMiddleware } from "../../identity/middleware/JwtMiddleware";
import type { PermissionMiddleware } from "../../identity/middleware/PermissionMiddleware";

import type { InventoryController } from "../controllers/InventoryController";
import { AdjustStockValidator } from "../validators/AdjustStockValidator";
import { DecreaseStockValidator } from "../validators/DecreaseStockValidator";
import { IncreaseStockValidator } from "../validators/IncreaseStockValidator";
import { ProductIdParamValidator } from "../validators/ProductIdParamValidator";
import { ReservationsQueryValidator } from "../validators/ReservationsQueryValidator";
import { StockHistoryQueryValidator } from "../validators/StockHistoryQueryValidator";

export interface InventoryRouteDependencies {
  inventoryController: InventoryController;
  jwtMiddleware: JwtMiddleware;
  permissionMiddleware: PermissionMiddleware;
}

// Reservation state is event-driven only (ProductCreated/OrderCreated/
// OrderCancelled) — there is deliberately no POST /reserve or /release route
// here. Only direct stock corrections (adjust/increase/decrease) and reads
// are exposed over HTTP.
export function inventoryRoutes({
  inventoryController,
  jwtMiddleware,
  permissionMiddleware,
}: InventoryRouteDependencies): Router {
  const router = Router();

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
}
