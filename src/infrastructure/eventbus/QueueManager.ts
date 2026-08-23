// src/infrastructure/eventbus/QueueManager.ts

import type { Channel, Options } from "amqplib";

export interface QueueBinding {
  queue: string;
  exchange: string;
  routingKey: string;
}

export interface QueueDeclaration extends QueueBinding {
  options?: Options.AssertQueue;
}

export class QueueManager {
  private readonly channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async ensure(queue: string, options: Options.AssertQueue = {}): Promise<void> {
    await this.channel.assertQueue(queue, {
      durable: true,
      ...options,
    });
  }

  async bind({ queue, exchange, routingKey }: QueueBinding): Promise<void> {
    await this.channel.bindQueue(queue, exchange, routingKey);
  }

  async ensureAndBind({
    queue,
    exchange,
    routingKey,
    options = {},
  }: QueueDeclaration): Promise<void> {
    await this.ensure(queue, options);

    await this.bind({
      queue,
      exchange,
      routingKey,
    });
  }
}
