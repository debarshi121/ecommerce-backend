// src/modules/inventory/consumers/ProductCreatedConsumer.js

class ProductCreatedConsumer {
  constructor({ inventoryService }) {
    this.inventoryService = inventoryService;
  }

  async handle(payload, tx) {
    await this.inventoryService.createInventory({ productId: payload.productId }, tx);
  }
}

module.exports = ProductCreatedConsumer;
