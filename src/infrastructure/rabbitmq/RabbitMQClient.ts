// src/infrastructure/rabbitmq/RabbitMQClient.ts

import amqp, { type Channel, type ChannelModel } from "amqplib";

import { rabbitmqConfig } from "../../config/rabbitmq";
import { InternalServerError } from "../../shared/errors/InternalServerError";

export class RabbitMQClient {
  private static instance: RabbitMQClient | null = null;

  private connection: ChannelModel | null = null;

  private channel: Channel | null = null;

  private constructor() {}

  static getInstance(): RabbitMQClient {
    if (!RabbitMQClient.instance) {
      RabbitMQClient.instance = new RabbitMQClient();
    }

    return RabbitMQClient.instance;
  }

  async connect(): Promise<void> {
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

  getChannel(): Channel {
    if (!this.channel) {
      throw new InternalServerError("RabbitMQ not connected");
    }

    return this.channel;
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }
}
