// src/infrastructure/eventbus/MessagingModule.ts

import type { RabbitModule } from "../../shared/constants/RabbitModules";

/**
 * Derives a module's whole RabbitMQ topology from its name, so the naming
 * convention lives in exactly one place:
 *
 *   catalog -> catalog.exchange
 *              catalog.retry.exchange      + catalog.retry.queue
 *              catalog.dead-letter.exchange + catalog.dead-letter.queue
 */
export class MessagingModule {
  readonly name: RabbitModule;

  constructor(name: RabbitModule) {
    this.name = name;
  }

  get exchange(): string {
    return `${this.name}.exchange`;
  }

  get retryExchange(): string {
    return `${this.name}.retry.exchange`;
  }

  get deadLetterExchange(): string {
    return `${this.name}.dead-letter.exchange`;
  }

  get retryQueue(): string {
    return `${this.name}.retry.queue`;
  }

  get deadLetterQueue(): string {
    return `${this.name}.dead-letter.queue`;
  }

  get deadLetterRoutingKey(): string {
    return "dead-letter";
  }
}
