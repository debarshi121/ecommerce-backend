// src/modules/inventory/events/InventoryReserved.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class InventoryReserved {
  static build({ orderId, items }) {
    return {
      eventName: EventNames.INVENTORY_RESERVED,

      module: RabbitModules.INVENTORY,

      routingKey: RoutingKeys.INVENTORY_RESERVED,

      payload: {
        orderId,
        items,
      },
    };
  }
}

module.exports = InventoryReserved;
