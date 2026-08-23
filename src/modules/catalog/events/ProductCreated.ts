// src/modules/catalog/events/ProductCreated.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { ProductRow } from "../../../shared/types/entities";
import type { DomainEventInput } from "../../../shared/types/events";
import type { ProductCreatedPayload } from "../contracts";

// Builds the { eventName, module, routingKey, payload } shape consumed by
// OutboxService.addEvent(). The Outbox row id becomes eventId, and the
// publish-time ISO timestamp is stamped on by EventPublisher — neither is
// set here so this stays a pure description of "what happened".
export class ProductCreated {
  static build(
    product: ProductRow,
  ): DomainEventInput<ProductCreatedPayload> {
    return {
      eventName: EventNames.PRODUCT_CREATED,

      module: RabbitModules.CATALOG,

      routingKey: RoutingKeys.PRODUCT_CREATED,

      payload: {
        productId: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        categoryId: product.categoryId,
        brandId: product.brandId,
        status: product.status,
      },
    };
  }
}
