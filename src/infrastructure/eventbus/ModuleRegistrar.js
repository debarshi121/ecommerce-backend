// src/infrastructure/eventbus/ModuleRegistrar.js

const MessagingModule = require("./MessagingModule");

class ModuleRegistrar {
  constructor({
    exchangeManager,
    queueManager,
    retryManager,
    deadLetterManager,
    eventConsumer,
  }) {
    this.exchangeManager = exchangeManager;
    this.queueManager = queueManager;
    this.retryManager = retryManager;
    this.deadLetterManager = deadLetterManager;
    this.eventConsumer = eventConsumer;
  }

  async register({ module, retryDelay = 5000, consumers }) {
    const messagingModule = new MessagingModule(module);

    /*
    ---------------------------------------
    Exchanges
    ---------------------------------------
    */

    await this.exchangeManager.ensure(messagingModule.exchange);

    /*
    ---------------------------------------
    Dead Letter Infrastructure
    ---------------------------------------
    */

    await this.deadLetterManager.ensure(messagingModule);

    /*
    ---------------------------------------
    Retry Infrastructure (one shared retry queue per module)
    ---------------------------------------
    */

    await this.retryManager.ensure({
      module: messagingModule,
      retryDelay,
    });

    /*
    ---------------------------------------
    Consumers
    ---------------------------------------
    */

    for (const consumer of consumers) {
      await this.queueManager.ensureAndBind({
        queue: consumer.queue,

        exchange: messagingModule.exchange,

        routingKey: consumer.routingKey,

        options: {
          arguments: {
            "x-dead-letter-exchange": messagingModule.deadLetterExchange,

            "x-dead-letter-routing-key": messagingModule.deadLetterRoutingKey,
          },
        },
      });

      await this.eventConsumer.consume({
        queue: consumer.queue,

        handler: consumer.handler,

        module: messagingModule,

        routingKey: consumer.routingKey,

        prefetch: consumer.prefetch ?? 10,

        maxRetries: consumer.maxRetries,
      });
    }
  }
}

module.exports = ModuleRegistrar;
