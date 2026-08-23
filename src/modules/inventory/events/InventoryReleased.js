// src/modules/inventory/events/InventoryReleased.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class InventoryReleased {
  static build({ orderId, items }) {
    return {
      eventName: EventNames.INVENTORY_RELEASED,

      module: RabbitModules.INVENTORY,

      routingKey: RoutingKeys.INVENTORY_RELEASED,

      payload: {
        orderId,
        items,
      },
    };
  }
}

module.exports = InventoryReleased;
