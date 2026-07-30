// src/modules/catalog/events/ProductCreated.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

// Builds the { eventName, module, routingKey, payload } shape consumed by
// OutboxService.addEvent(). The Outbox row id becomes eventId, and the
// publish-time ISO timestamp is stamped on by EventPublisher — neither is
// set here so this stays a pure description of "what happened".
class ProductCreated {
  static build(product) {
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

module.exports = ProductCreated;
