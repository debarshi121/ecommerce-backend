// src/modules/inventory/events/InventoryReleased.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { DomainEventInput } from "../../../shared/types/events";
import type { InventoryReleasedPayload } from "../contracts";

export class InventoryReleased {
  static build({
    orderId,
    items,
  }: InventoryReleasedPayload): DomainEventInput<InventoryReleasedPayload> {
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
