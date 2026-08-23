// src/modules/inventory/events/InventoryAdjusted.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { DomainEventInput } from "../../../shared/types/events";
import type { InventoryAdjustedPayload } from "../contracts";

export class InventoryAdjusted {
  static build({
    productId,
    movementType,
    quantity,
    availableQuantity,
    reservedQuantity,
  }: InventoryAdjustedPayload): DomainEventInput<InventoryAdjustedPayload> {
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
