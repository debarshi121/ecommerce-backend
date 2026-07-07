// src/infrastructure/eventbus/EventPublisher.js

const MessagingModule = require("./MessagingModule");

class EventPublisher {
  constructor(rabbitClient) {
    this.channel = rabbitClient.getChannel();
  }

  async publish({ module, eventName, routingKey, payload }) {
    const messagingModule = new MessagingModule(module);

    const message = {
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
