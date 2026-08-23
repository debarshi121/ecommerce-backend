// src/modules/inventory/dto/AdjustStockDto.ts

import type { AdjustStockInput } from "../validators/AdjustStockValidator";

export interface AdjustStockData {
  quantityDelta: number;
  reason: string | null;
}

export class AdjustStockDto {
  static fromRequest(body: AdjustStockInput["body"]): AdjustStockData {
    return {
      quantityDelta: body.quantityDelta,
      reason: body.reason ? body.reason.trim() : null,
    };
  }
}
