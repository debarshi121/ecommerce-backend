// src/infrastructure/rabbitmq/RabbitMQClient.js

const amqp = require("amqplib");
const rabbitmqConfig = require("../../config/rabbitmq");

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

    const { protocol, host, port, user, password } = rabbitmqConfig;
    const credentials = user && password ? `${user}:${password}@` : "";
    const url = `${protocol}://${credentials}${host}:${port}`;
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
