// src/modules/inventory/consumers/OrderCreatedConsumer.ts

import type { Transaction } from "../../../shared/types/database";
import type { OrderCreatedPayload } from "../contracts";
import type { InventoryService } from "../services/InventoryService";

export interface OrderCreatedConsumerDependencies {
  inventoryService: InventoryService;
}

export class OrderCreatedConsumer {
  private readonly inventoryService: InventoryService;

  constructor({ inventoryService }: OrderCreatedConsumerDependencies) {
    this.inventoryService = inventoryService;
  }

  async handle(payload: OrderCreatedPayload, tx: Transaction): Promise<void> {
    await this.inventoryService.reserveStock(
      { orderId: payload.orderId, items: payload.items },
      tx,
    );
  }
}
