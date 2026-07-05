const ExchangeNames = require("../../shared/constants/ExchangeNames");

class EventPublisher {
  constructor(rabbitClient) {
    this.channel = rabbitClient.getChannel();
  }

  async publish({ exchange, routingKey, eventName, payload }) {
    const message = {
      eventName,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
      },
    );
  }

  async ensureExchange(exchange = ExchangeNames.IDENTITY) {
    await this.channel.assertExchange(exchange, "topic", {
      durable: true,
    });
  }
}

module.exports = EventPublisher;
