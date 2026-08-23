// src/modules/inventory/events/InventoryReservationFailed.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { DomainEventInput } from "../../../shared/types/events";
import type { InventoryReservationFailedPayload } from "../contracts";

export class InventoryReservationFailed {
  static build({
    orderId,
    items,
    shortage,
  }: InventoryReservationFailedPayload): DomainEventInput<InventoryReservationFailedPayload> {
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
