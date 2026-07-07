const RoutingKeys = require("../../shared/constants/RoutingKeys");

class DeadLetterManager {
  constructor({ exchangeManager, queueManager }) {
    this.exchangeManager = exchangeManager;
    this.queueManager = queueManager;
  }

  async ensure(module) {
    await this.exchangeManager.ensure(module.deadLetterExchange);

    await this.queueManager.ensureAndBind({
      queue: module.deadLetterQueue,

      exchange: module.deadLetterExchange,

      routingKey: RoutingKeys.DLQ,
    });
  }
}

module.exports = DeadLetterManager;
