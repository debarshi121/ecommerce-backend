// src/modules/inventory/dto/InventoryResponseDto.ts

import type { InventoryRow } from "../../../shared/types/entities";

export interface InventoryResponse {
  id: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  /** Derived for clients so they never have to add the two counters. */
  totalQuantity: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class InventoryResponseDto {
  static fromEntity(inventory: InventoryRow | null): InventoryResponse | null {
    if (!inventory) {
      return null;
    }

    return {
      id: inventory.id,
      productId: inventory.productId,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      totalQuantity: inventory.availableQuantity + inventory.reservedQuantity,
      version: inventory.version,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }

  static fromList(items: InventoryRow[]): (InventoryResponse | null)[] {
    return items.map((item) => InventoryResponseDto.fromEntity(item));
  }
}
