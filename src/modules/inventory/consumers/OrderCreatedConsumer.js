// src/modules/inventory/consumers/OrderCreatedConsumer.js

class OrderCreatedConsumer {
  constructor({ inventoryService }) {
    this.inventoryService = inventoryService;
  }

  async handle(payload, tx) {
    await this.inventoryService.reserveStock(
      { orderId: payload.orderId, items: payload.items },
      tx,
    );
  }
}

module.exports = OrderCreatedConsumer;
