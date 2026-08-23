// src/modules/inventory/consumers/ProductCreatedConsumer.ts

import type { Transaction } from "../../../shared/types/database";
import type { ProductCreatedPayload } from "../../catalog/contracts";
import type { InventoryService } from "../services/InventoryService";

export interface ProductCreatedConsumerDependencies {
  inventoryService: InventoryService;
}

/**
 * Catalog announces a new product; Inventory answers by opening its stock
 * record. `tx` is the transaction InboxService already opened, so the inbox
 * row and this write commit together.
 */
export class ProductCreatedConsumer {
  private readonly inventoryService: InventoryService;

  constructor({ inventoryService }: ProductCreatedConsumerDependencies) {
    this.inventoryService = inventoryService;
  }

  async handle(
    payload: ProductCreatedPayload,
    tx: Transaction,
  ): Promise<void> {
    await this.inventoryService.createInventory(
      { productId: payload.productId },
      tx,
    );
  }
}
