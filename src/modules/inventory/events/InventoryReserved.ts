// src/modules/inventory/events/InventoryReserved.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { DomainEventInput } from "../../../shared/types/events";
import type { InventoryReservedPayload } from "../contracts";

export class InventoryReserved {
  static build({
    orderId,
    items,
  }: InventoryReservedPayload): DomainEventInput<InventoryReservedPayload> {
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
