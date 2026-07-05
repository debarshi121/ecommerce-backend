// src/shared/services/EventBusService.js

class EventBusService {
  constructor({ eventPublisher }) {
    this.eventPublisher = eventPublisher;
  }

  async publish(event) {
    await this.eventPublisher.publish({
      exchange: event.exchange,
      routingKey: event.routingKey,
      eventName: event.eventName,
      payload: event.payload,
    });
  }
}

module.exports = EventBusService;
