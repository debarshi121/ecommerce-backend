// src/modules/catalog/events/ProductArchived.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { ProductRow } from "../../../shared/types/entities";
import type { DomainEventInput } from "../../../shared/types/events";
import type { ProductArchivedPayload } from "../contracts";

export class ProductArchived {
  static build(
    product: ProductRow,
  ): DomainEventInput<ProductArchivedPayload> {
    return {
      eventName: EventNames.PRODUCT_ARCHIVED,

      module: RabbitModules.CATALOG,

      routingKey: RoutingKeys.PRODUCT_ARCHIVED,

      payload: {
        productId: product.id,
        sku: product.sku,
        slug: product.slug,
      },
    };
  }
}
