// src/modules/inventory/dto/StockMovementResponseDto.ts

import type { StockMovementRow } from "../../../shared/types/entities";
import type { StockMovementTypeValue } from "../constants/StockMovementType";

export interface StockMovementResponse {
  id: string;
  productId: string;
  movementType: StockMovementTypeValue;
  quantity: number;
  referenceId: string | null;
  reason: string | null;
  createdAt: Date;
}

export class StockMovementResponseDto {
  static fromEntity(
    movement: StockMovementRow | null,
  ): StockMovementResponse | null {
    if (!movement) {
      return null;
    }

    return {
      id: movement.id,
      productId: movement.productId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      referenceId: movement.referenceId,
      reason: movement.reason,
      createdAt: movement.createdAt,
    };
  }

  static fromList(items: StockMovementRow[]): (StockMovementResponse | null)[] {
    return items.map((item) => StockMovementResponseDto.fromEntity(item));
  }
}
