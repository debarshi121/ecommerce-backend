// src/infrastructure/eventbus/EventConsumer.js

const logger = require("../logging/Logger");

class EventConsumer {
  constructor(rabbitClient, retryStrategy) {
    this.channel = rabbitClient.getChannel();
    this.retryStrategy = retryStrategy;
  }

  async consume({ queue, handler, module, routingKey, prefetch = 10, maxRetries }) {
    await this.channel.prefetch(prefetch);

    this.channel.consume(queue, async (message) => {
      if (!message) {
        return;
      }

      try {
        const event = JSON.parse(message.content.toString());

        await handler(event);

        this.channel.ack(message);
      } catch (error) {
        logger.error("Event handler failed", {
          queue,
          routingKey,
          error: error.message,
          stack: error.stack,
        });

        await this.retryStrategy.handle({
          message,
          error,
          module,
          routingKey,
          maxRetries,
        });
      }
    });

    logger.info("Consumer started", {
      queue,
      prefetch,
    });
  }
}

module.exports = EventConsumer;
