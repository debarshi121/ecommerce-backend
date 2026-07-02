// src/workers/OutboxPublisherWorker.js

class OutboxPublisherWorker {
  constructor({ outboxService, eventBusService }) {
    this.outboxService = outboxService;

    this.eventBusService = eventBusService;
  }

  async handle() {
    const events = await this.outboxService.getUnprocessedEvents(20);

    for (const event of events) {
      try {
        await this.eventBusService.publish({
          eventName: event.eventName,
          exchange: event.exchange,
          routingKey: event.routingKey,
          payload: event.payload,
        });

        await this.outboxService.markProcessed(event.id);

        console.log(`Outbox processed ${event.id}`);
      } catch (error) {
        console.error(`Failed outbox event ${event.id}`, error);

        /*
          DO NOT mark processed

          worker retries later
        */
      }
    }
  }
}

module.exports = OutboxPublisherWorker;
