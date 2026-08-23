// src/modules/catalog/events/ProductUpdated.ts

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { ProductRow } from "../../../shared/types/entities";
import type { DomainEventInput } from "../../../shared/types/events";
import type { ProductUpdatedPayload } from "../contracts";

export class ProductUpdated {
  static build(
    product: ProductRow,
    changedFields: string[],
  ): DomainEventInput<ProductUpdatedPayload> {
    return {
      eventName: EventNames.PRODUCT_UPDATED,

      module: RabbitModules.CATALOG,

      routingKey: RoutingKeys.PRODUCT_UPDATED,

      payload: {
        productId: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        categoryId: product.categoryId,
        brandId: product.brandId,
        status: product.status,
        changedFields: changedFields || [],
      },
    };
  }
}
