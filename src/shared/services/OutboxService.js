// src/shared/services/OutboxService.js

class OutboxService {
  constructor({ outboxRepository }) {
    this.outboxRepository = outboxRepository;
  }

  async addEvent(event, tx = null) {
    return this.outboxRepository.create(
      {
        eventName: event.eventName,

        exchange: event.exchange,

        routingKey: event.routingKey,

        payload: event.payload,
      },

      tx,
    );
  }

  async getUnprocessedEvents(limit = 20) {
    return this.outboxRepository.findUnprocessed(limit);
  }

  async markProcessed(eventId) {
    await this.outboxRepository.markProcessed(eventId);
  }
}

module.exports = OutboxService;
