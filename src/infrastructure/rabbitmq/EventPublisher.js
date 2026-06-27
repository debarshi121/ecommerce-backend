// src/infrastructure/rabbitmq/EventPublisher.js

class EventPublisher {
  constructor(rabbitClient) {
    this.channel = rabbitClient.getChannel();

    this.exchange = "domain-events";
  }

  publish(eventName, payload) {
    const message = {
      eventName,

      timestamp: new Date().toISOString(),

      data: payload,
    };

    this.channel.publish(
      this.exchange,

      eventName,

      Buffer.from(JSON.stringify(message)),

      {
        persistent: true,
      },
    );
  }

  async ensureExchange() {
    await this.channel.assertExchange(this.exchange, "topic", {
      durable: true,
    });
  }
}

module.exports = EventPublisher;
