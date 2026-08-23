// src/modules/inventory/controllers/InventoryController.ts

import type { NextFunction, Request, Response } from "express";

import { buildPaginationMeta } from "../../../shared/types/pagination";
import { validated } from "../../../shared/validators/validate";

import { AdjustStockDto } from "../dto/AdjustStockDto";
import { DecreaseStockDto } from "../dto/DecreaseStockDto";
import { IncreaseStockDto } from "../dto/IncreaseStockDto";
import { InventoryResponseDto } from "../dto/InventoryResponseDto";
import { ReservationResponseDto } from "../dto/ReservationResponseDto";
import { StockMovementResponseDto } from "../dto/StockMovementResponseDto";
import type { InventoryService } from "../services/InventoryService";
import type { AdjustStockInput } from "../validators/AdjustStockValidator";
import type { DecreaseStockInput } from "../validators/DecreaseStockValidator";
import type { IncreaseStockInput } from "../validators/IncreaseStockValidator";
import type { ProductIdParamInput } from "../validators/ProductIdParamValidator";
import type { ReservationsQueryInput } from "../validators/ReservationsQueryValidator";
import type { StockHistoryQueryInput } from "../validators/StockHistoryQueryValidator";

export class InventoryController {
  private readonly inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  async getByProduct(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params } = validated<ProductIdParamInput>(req);

      const inventory = await this.inventoryService.getAvailability(
        params.productId,
      );

      return res.json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async adjust(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<AdjustStockInput>(req);

      const data = AdjustStockDto.fromRequest(body);

      const inventory = await this.inventoryService.adjustStock({
        productId: params.productId,
        quantityDelta: data.quantityDelta,
        reason: data.reason,
      });

      return res.json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async increase(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<IncreaseStockInput>(req);

      const data = IncreaseStockDto.fromRequest(body);

      const inventory = await this.inventoryService.increaseStock({
        productId: params.productId,
        quantity: data.quantity,
        reason: data.reason,
      });

      return res.status(201).json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async decrease(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, body } = validated<DecreaseStockInput>(req);

      const data = DecreaseStockDto.fromRequest(body);

      const inventory = await this.inventoryService.decreaseStock({
        productId: params.productId,
        quantity: data.quantity,
        reason: data.reason,
      });

      return res.json(InventoryResponseDto.fromEntity(inventory));
    } catch (error) {
      next(error);
    }
  }

  async history(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, query } = validated<StockHistoryQueryInput>(req);

      const { items, total } = await this.inventoryService.getHistory(
        params.productId,
        query,
      );

      return res.json({
        items: StockMovementResponseDto.fromList(items),
        pagination: buildPaginationMeta(query.page, query.limit, total),
      });
    } catch (error) {
      next(error);
    }
  }

  async reservations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { params, query } = validated<ReservationsQueryInput>(req);

      const { items, total } = await this.inventoryService.getReservations(
        params.productId,
        query,
      );

      return res.json({
        items: ReservationResponseDto.fromList(items),
        pagination: buildPaginationMeta(query.page, query.limit, total),
      });
    } catch (error) {
      next(error);
    }
  }
}
