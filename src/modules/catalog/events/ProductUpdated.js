// src/modules/catalog/events/ProductUpdated.js

const EventNames = require("../../../shared/constants/EventNames");
const RabbitModules = require("../../../shared/constants/RabbitModules");
const RoutingKeys = require("../../../shared/constants/RoutingKeys");

class ProductUpdated {
  static build(product, changedFields) {
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

module.exports = ProductUpdated;
