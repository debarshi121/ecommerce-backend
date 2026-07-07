// src/infrastructure/eventbus/RetryStrategy.js

const logger = require("../logging/Logger");

class RetryStrategy {
  constructor(channel, options = {}) {
    this.channel = channel;
    this.defaultMaxRetries = options.maxRetries ?? 3;
  }

  async handle({ message, error, module, routingKey, maxRetries }) {
    const retryLimit = maxRetries ?? this.defaultMaxRetries;

    const retryCount = Number(
      message.properties.headers?.["x-retry-count"] || 0,
    );

    if (retryCount < retryLimit) {
      this.channel.publish(module.retryExchange, routingKey, message.content, {
        persistent: true,

        headers: {
          ...message.properties.headers,
          "x-retry-count": retryCount + 1,
        },
      });

      logger.warn("Message scheduled for retry", {
        module: module.name,
        routingKey,
        retryCount: retryCount + 1,
        maxRetries: retryLimit,
        error: error?.message,
      });

      this.channel.ack(message);

      return;
    }

    logger.error("Retry limit exceeded, routing to dead letter queue", {
      module: module.name,
      routingKey,
      retryCount,
      error: error?.message,
      stack: error?.stack,
    });

    this.channel.nack(message, false, false);
  }
}

module.exports = RetryStrategy;
