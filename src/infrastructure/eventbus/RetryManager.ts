// src/infrastructure/eventbus/RetryManager.ts

import type { ExchangeManager } from "./ExchangeManager";
import type { MessagingModule } from "./MessagingModule";
import type { QueueManager } from "./QueueManager";

export interface RetryManagerDependencies {
  exchangeManager: ExchangeManager;
  queueManager: QueueManager;
}

export interface EnsureRetryOptions {
  module: MessagingModule;
  retryDelay?: number;
}

export class RetryManager {
  private readonly exchangeManager: ExchangeManager;

  private readonly queueManager: QueueManager;

  constructor({ exchangeManager, queueManager }: RetryManagerDependencies) {
    this.exchangeManager = exchangeManager;
    this.queueManager = queueManager;
  }

  async ensure({
    module,
    retryDelay = 5000,
  }: EnsureRetryOptions): Promise<void> {
    await this.exchangeManager.ensure(module.retryExchange);

    // Bound with "#" (catch-all) and no explicit x-dead-letter-routing-key so a
    // single retry queue can safely serve every consumer in the module: RabbitMQ
    // preserves each message's original routing key on TTL expiry, which is what
    // routes it back to the correct consumer queue on module.exchange.
    await this.queueManager.ensureAndBind({
      queue: module.retryQueue,

      exchange: module.retryExchange,

      routingKey: "#",

      options: {
        arguments: {
          "x-message-ttl": retryDelay,

          "x-dead-letter-exchange": module.exchange,
        },
      },
    });
  }
}
