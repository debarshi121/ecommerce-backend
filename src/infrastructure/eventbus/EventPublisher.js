// src/infrastructure/eventbus/EventPublisher.js

const MessagingModule = require("./MessagingModule");

class EventPublisher {
  constructor(rabbitClient) {
    this.channel = rabbitClient.getChannel();
  }

  async publish({ eventId, module, eventName, routingKey, payload }) {
    if (!eventId) {
      throw new Error(
        "EventPublisher.publish requires a stable eventId (pass the Outbox row id) so consumers can deduplicate redeliveries",
      );
    }

    const messagingModule = new MessagingModule(module);

    const message = {
      eventId,
      eventName,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.channel.publish(
      messagingModule.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
      },
    );
  }
}

module.exports = EventPublisher;
