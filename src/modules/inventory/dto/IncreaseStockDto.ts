// src/modules/inventory/dto/IncreaseStockDto.ts

import type { IncreaseStockInput } from "../validators/IncreaseStockValidator";

export interface StockQuantityData {
  quantity: number;
  reason: string | null;
}

export class IncreaseStockDto {
  static fromRequest(body: IncreaseStockInput["body"]): StockQuantityData {
    return {
      quantity: body.quantity,
      reason: body.reason ? body.reason.trim() : null,
    };
  }
}
