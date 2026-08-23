// src/modules/inventory/controllers/InventoryController.js

const AdjustStockDto = require("../dto/AdjustStockDto");
const IncreaseStockDto = require("../dto/IncreaseStockDto");
const DecreaseStockDto = require("../dto/DecreaseStockDto");
const InventoryResponseDto = require("../dto/InventoryResponseDto");
const StockMovementResponseDto = require("../dto/StockMovementResponseDto");
const ReservationResponseDto = require("../dto/ReservationResponseDto");

class InventoryController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  async getByProduct(req, res, next) {
    try {
      const inventory = await this.inventoryService.getAvailability(req.params.productId);

      return res.json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async adjust(req, res, next) {
    try {
      const data = AdjustStockDto.fromRequest(req.body);

      const inventory = await this.inventoryService.adjustStock({
        productId: req.params.productId,
        quantityDelta: data.quantityDelta,
        reason: data.reason,
      });

      return res.json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async increase(req, res, next) {
    try {
      const data = IncreaseStockDto.fromRequest(req.body);

      const inventory = await this.inventoryService.increaseStock({
        productId: req.params.productId,
        quantity: data.quantity,
        reason: data.reason,
      });

      return res.status(201).json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async decrease(req, res, next) {
    try {
      const data = DecreaseStockDto.fromRequest(req.body);

      const inventory = await this.inventoryService.decreaseStock({
        productId: req.params.productId,
        quantity: data.quantity,
        reason: data.reason,
      });

      return res.json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async history(req, res, next) {
    try {
      const { items, total } = await this.inventoryService.getHistory(
        req.params.productId,
        req.query,
      );

      return res.json({
        items: StockMovementResponseDto.fromList(items),
        pagination: {
          page: req.query.page,
          limit: req.query.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / req.query.limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async reservations(req, res, next) {
    try {
      const { items, total } = await this.inventoryService.getReservations(
        req.params.productId,
        req.query,
      );

      return res.json({
        items: ReservationResponseDto.fromList(items),
        pagination: {
          page: req.query.page,
          limit: req.query.limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / req.query.limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InventoryController;
