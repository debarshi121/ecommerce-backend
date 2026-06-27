// src/infrastructure/rabbitmq/RabbitMQClient.js

const amqp = require("amqplib");

class RabbitMQClient {
  static instance = null;

  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    if (this.connection && this.channel) {
      return;
    }

    this.connection = await amqp.connect(url);

    this.channel = await this.connection.createChannel();

    this.connection.on(
      "close",

      () => {
        this.connection = null;
        this.channel = null;
      },
    );
  }

  getChannel() {
    if (!this.channel) {
      throw new Error("RabbitMQ not connected");
    }

    return this.channel;
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }

  static getInstance() {
    if (!RabbitMQClient.instance) {
      RabbitMQClient.instance = new RabbitMQClient();
    }

    return RabbitMQClient.instance;
  }
}

module.exports = RabbitMQClient;
