// src/shared/services/EventBusService.js

class EventBusService {
  constructor({ eventPublisher }) {
    this.eventPublisher = eventPublisher;
  }

  async publish(event) {
    console.log(`Publishing event ${event.eventName}`);

    await this.eventPublisher.publish(
      event.exchange,
      event.routingKey,
      event.payload,
    );
  }
}

module.exports = EventBusService;
