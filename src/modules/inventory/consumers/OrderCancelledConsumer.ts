// src/modules/inventory/consumers/OrderCancelledConsumer.ts

import type { Transaction } from "../../../shared/types/database";
import type { OrderCancelledPayload } from "../contracts";
import type { InventoryService } from "../services/InventoryService";

export interface OrderCancelledConsumerDependencies {
  inventoryService: InventoryService;
}

export class OrderCancelledConsumer {
  private readonly inventoryService: InventoryService;

  constructor({ inventoryService }: OrderCancelledConsumerDependencies) {
    this.inventoryService = inventoryService;
  }

  async handle(
    payload: OrderCancelledPayload,
    tx: Transaction,
  ): Promise<void> {
    await this.inventoryService.releaseReservation(
      { orderId: payload.orderId },
      tx,
    );
  }
}
