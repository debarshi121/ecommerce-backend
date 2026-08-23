// src/modules/inventory/dto/DecreaseStockDto.ts

import type { DecreaseStockInput } from "../validators/DecreaseStockValidator";
import type { StockQuantityData } from "./IncreaseStockDto";

export class DecreaseStockDto {
  static fromRequest(body: DecreaseStockInput["body"]): StockQuantityData {
    return {
      quantity: body.quantity,
      reason: body.reason ? body.reason.trim() : null,
    };
  }
}
