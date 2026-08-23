// src/modules/inventory/events/InventoryReservationFailed.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class InventoryReservationFailed {
  static build({ orderId, items, shortage }) {
    return {
      eventName: EventNames.INVENTORY_RESERVATION_FAILED,

      module: RabbitModules.INVENTORY,

      routingKey: RoutingKeys.INVENTORY_RESERVATION_FAILED,

      payload: {
        orderId,
        items,
        shortage,
      },
    };
  }
}

module.exports = InventoryReservationFailed;
