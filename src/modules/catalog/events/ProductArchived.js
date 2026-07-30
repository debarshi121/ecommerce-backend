// src/modules/catalog/events/ProductArchived.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class ProductArchived {
  static build(product) {
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

module.exports = ProductArchived;
