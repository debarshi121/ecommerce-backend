// src/infrastructure/rabbitmq/EventConsumer.js
const logger = require("../logging/Logger");

class EventConsumer {
  constructor(rabbitClient) {
    this.channel = rabbitClient.getChannel();
  }

  async consume({ exchange, queue, routingKey, handler, prefetch = 10 }) {
    await this.channel.assertQueue(queue, {
      durable: true,
    });

    await this.channel.bindQueue(queue, exchange, routingKey);

    await this.channel.prefetch(prefetch);

    this.channel.consume(queue, async (message) => {
      if (!message) {
        return;
      }

      try {
        const event = JSON.parse(message.content.toString());

        await handler(event);

        this.channel.ack(message);
      } catch (error) {
        logger.error("RabbitMQ consumer failed", {
          exchange,
          queue,
          routingKey,
          error: error.message,
          stack: error.stack,
        });

        this.channel.nack(message, false, false);
      }
    });

    logger.info("RabbitMQ consumer started", {
      exchange,
      queue,
      routingKey,
    });
  }
}

module.exports = EventConsumer;
