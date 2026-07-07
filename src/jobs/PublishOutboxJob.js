const logger = require("../infrastructure/logging/Logger");

class PublishOutboxJob {
  constructor({ outboxService, eventBusService }) {
    this.outboxService = outboxService;
    this.eventBusService = eventBusService;
  }

  async handle(job) {
    const pendingEvents = await this.outboxService.getUnprocessedEvents(20);

    for (const event of pendingEvents) {
      try {
        await this.eventBusService.publish({
          eventName: event.eventName,
          module: event.module,
          routingKey: event.routingKey,
          payload: event.payload,
        });

        await this.outboxService.markProcessed(event.id);

        logger.info("Outbox event published", {
          eventId: event.id,
          eventName: event.eventName,
          routingKey: event.routingKey,
        });
      } catch (error) {
        logger.error("Failed to publish outbox event", {
          eventId: event.id,
          eventName: event.eventName,
          routingKey: event.routingKey,
          error: error.message,
          stack: error.stack,
        });

        // Leave unprocessed so the job retries later.
      }
    }
  }
}

module.exports = PublishOutboxJob;
