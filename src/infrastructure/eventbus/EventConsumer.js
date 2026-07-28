// src/infrastructure/eventbus/EventConsumer.js

const logger = require("../logging/Logger");

class EventConsumer {
  constructor(rabbitClient, retryStrategy, inboxService) {
    this.channel = rabbitClient.getChannel();
    this.retryStrategy = retryStrategy;
    this.inboxService = inboxService;
  }

  async consume({ queue, handler, module, routingKey, prefetch = 10, maxRetries }) {
    await this.channel.prefetch(prefetch);

    this.channel.consume(queue, async (message) => {
      if (!message) {
        return;
      }

      let event;

      try {
        event = JSON.parse(message.content.toString());
      } catch (error) {
        logger.error("Failed to parse event payload, routing to dead letter queue", {
          queue,
          routingKey,
          error: error.message,
          stack: error.stack,
        });

        this.channel.nack(message, false, false);

        return;
      }

      try {
        const { duplicate } = await this.inboxService.processEvent({
          event,
          module: module.name,
          queue,
          handler,
        });

        if (duplicate) {
          logger.warn("Duplicate event skipped by inbox", {
            queue,
            routingKey,
            eventId: event.eventId,
            eventName: event.eventName,
          });
        }

        this.channel.ack(message);
      } catch (error) {
        logger.error("Event handler failed", {
          queue,
          routingKey,
          eventId: event.eventId,
          eventName: event.eventName,
          error: error.message,
          stack: error.stack,
        });

        const { deadLettered } = await this.retryStrategy.handle({
          message,
          error,
          module,
          routingKey,
          maxRetries,
        });

        if (deadLettered) {
          await this.inboxService.fail(
            {
              eventId: event.eventId,
              eventName: event.eventName,
              module: module.name,
              queue,
              payload: event.payload,
            },
            error,
          );
        }
      }
    });

    logger.info("Consumer started", {
      queue,
      prefetch,
    });
  }
}

module.exports = EventConsumer;
