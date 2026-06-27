// src/infrastructure/rabbitmq/EventConsumer.js

class EventConsumer {
  constructor(rabbitClient) {
    this.channel = rabbitClient.getChannel();

    this.exchange = "domain-events";
  }

  async consume(queue, routingKey, handler) {
    await this.channel.assertQueue(queue, {
      durable: true,
    });

    await this.channel.bindQueue(queue, this.exchange, routingKey);

    await this.channel.prefetch(10);

    this.channel.consume(
      queue,

      async (message) => {
        if (!message) {
          return;
        }

        try {
          const event = JSON.parse(message.content.toString());

          await handler(event);

          this.channel.ack(message);
        } catch (error) {
          this.channel.nack(message, false, false);
        }
      },
    );
  }
}

module.exports = EventConsumer;
