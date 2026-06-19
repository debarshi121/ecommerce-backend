// src/infrastructure/rabbitmq/EventConsumer.js

class EventConsumer {
    constructor(rabbitClient) {
        this.channel = rabbitClient.getChannel();
    }

    async consume(
        exchange,
        queue,
        routingKey,
        handler
    ) {

        await this.channel.assertExchange(
            exchange,
            "topic",
            { durable: true }
        );

        await this.channel.assertQueue(
            queue,
            { durable: true }
        );

        await this.channel.bindQueue(
            queue,
            exchange,
            routingKey
        );

        this.channel.consume(
            queue,
            async (message) => {

                try {

                    const payload =
                        JSON.parse(
                            message.content.toString()
                        );

                    await handler(payload);

                    this.channel.ack(message);

                } catch (error) {

                    console.error(error);

                    this.channel.nack(
                        message,
                        false,
                        false
                    );
                }
            }
        );
    }
}

module.exports = EventConsumer;