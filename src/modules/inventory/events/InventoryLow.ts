// src/modules/inventory/events/InventoryLow.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { DomainEventInput } from "../../../shared/types/events";
import type { InventoryLowPayload } from "../contracts";

export class InventoryLow {
  static build({
    productId,
    availableQuantity,
    threshold,
  }: InventoryLowPayload): DomainEventInput<InventoryLowPayload> {
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
