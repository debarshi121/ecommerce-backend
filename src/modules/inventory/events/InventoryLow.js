// src/modules/inventory/events/InventoryLow.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class InventoryLow {
  static build({ productId, availableQuantity, threshold }) {
    return {
      eventName: EventNames.INVENTORY_LOW,

      module: RabbitModules.INVENTORY,

      routingKey: RoutingKeys.INVENTORY_LOW,

      payload: {
        productId,
        availableQuantity,
        threshold,
      },
    };
  }
}

module.exports = InventoryLow;
