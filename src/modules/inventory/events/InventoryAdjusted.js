// src/modules/inventory/events/InventoryAdjusted.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class InventoryAdjusted {
  static build({ productId, movementType, quantity, availableQuantity, reservedQuantity }) {
    return {
      eventName: EventNames.INVENTORY_ADJUSTED,

      module: RabbitModules.INVENTORY,

      routingKey: RoutingKeys.INVENTORY_ADJUSTED,

      payload: {
        productId,
        movementType,
        quantity,
        availableQuantity,
        reservedQuantity,
      },
    };
  }
}

module.exports = InventoryAdjusted;
