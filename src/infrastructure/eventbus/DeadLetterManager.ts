// src/infrastructure/eventbus/DeadLetterManager.ts

import { RoutingKeys } from "../../shared/constants/RoutingKeys";

import type { ExchangeManager } from "./ExchangeManager";
import type { MessagingModule } from "./MessagingModule";
import type { QueueManager } from "./QueueManager";

export interface DeadLetterManagerDependencies {
  exchangeManager: ExchangeManager;
  queueManager: QueueManager;
}

export class DeadLetterManager {
  private readonly exchangeManager: ExchangeManager;

  private readonly queueManager: QueueManager;

  constructor({ exchangeManager, queueManager }: DeadLetterManagerDependencies) {
    this.exchangeManager = exchangeManager;
    this.queueManager = queueManager;
  }

  async ensure(module: MessagingModule): Promise<void> {
    await this.exchangeManager.ensure(module.deadLetterExchange);

    await this.queueManager.ensureAndBind({
      queue: module.deadLetterQueue,

      exchange: module.deadLetterExchange,

      routingKey: RoutingKeys.DLQ,
    });
  }
}
