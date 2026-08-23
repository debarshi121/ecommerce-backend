// src/modules/inventory/consumers/OrderCancelledConsumer.js

class OrderCancelledConsumer {
  constructor({ inventoryService }) {
    this.inventoryService = inventoryService;
  }

  async handle(payload, tx) {
    await this.inventoryService.releaseReservation({ orderId: payload.orderId }, tx);
  }
}

module.exports = OrderCancelledConsumer;
