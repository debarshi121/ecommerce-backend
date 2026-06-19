// src/infrastructure/rabbitmq/EventPublisher.js

class EventPublisher {
    constructor(rabbitClient) {
        this.channel = rabbitClient.getChannel();
    }

    async publish(exchange, routingKey, payload) {

        await this.channel.assertExchange(
            exchange,
            "topic",
            { durable: true }
        );

        this.channel.publish(
            exchange,
            routingKey,
            Buffer.from(
                JSON.stringify(payload)
            )
        );

        console.log(
            `Published ${routingKey}`
        );
    }
}

module.exports = EventPublisher;