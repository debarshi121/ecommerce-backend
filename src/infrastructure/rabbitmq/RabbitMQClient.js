// src/infrastructure/rabbitmq/RabbitMQClient.js

const amqp = require("amqplib");

class RabbitMQClient {
    static instance = null;

    constructor() {
        if (RabbitMQClient.instance) {
            return RabbitMQClient.instance;
        }

        this.connection = null;
        this.channel = null;

        RabbitMQClient.instance = this;
    }

    async connect() {
        try {
            this.connection = await amqp.connect(
                `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`
            );

            this.channel = await this.connection.createChannel();

            console.log("RabbitMQ connected");

        } catch (error) {
            console.error("RabbitMQ connection failed", error);
            throw error;
        }
    }

    getChannel() {
        return this.channel;
    }

    static getInstance() {
        if (!RabbitMQClient.instance) {
            RabbitMQClient.instance = new RabbitMQClient();
        }

        return RabbitMQClient.instance;
    }
}

module.exports = RabbitMQClient;