// src/infrastructure/eventbus/ExchangeManager.ts

import type { Channel } from "amqplib";

export class ExchangeManager {
  private readonly channel: Channel;

  constructor(channel: Channel) {
    this.channel = channel;
  }

  async ensure(exchange: string): Promise<void> {
    await this.channel.assertExchange(exchange, "topic", {
      durable: true,
    });
  }

  async ensureMany(exchanges: string[]): Promise<void> {
    for (const exchange of exchanges) {
      await this.ensure(exchange);
    }
  }
}
