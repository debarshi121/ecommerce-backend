// src/infrastructure/eventbus/ModuleRegistrar.ts

import type { RabbitModule } from "../../shared/constants/RabbitModules";
import type { EventHandler } from "../../shared/types/events";

import type { DeadLetterManager } from "./DeadLetterManager";
import type { EventConsumer } from "./EventConsumer";
import type { ExchangeManager } from "./ExchangeManager";
import { MessagingModule } from "./MessagingModule";
import type { QueueManager } from "./QueueManager";
import type { RetryManager } from "./RetryManager";

export interface ModuleRegistrarDependencies {
  exchangeManager: ExchangeManager;
  queueManager: QueueManager;
  retryManager: RetryManager;
  deadLetterManager: DeadLetterManager;
  eventConsumer: EventConsumer;
}

/** One queue bound to one routing key, handled by one callback. */
export interface ConsumerRegistration {
  queue: string;
  routingKey: string;
  handler: EventHandler;
  maxRetries?: number;
  prefetch?: number;
}

export interface ModuleRegistration {
  module: RabbitModule;
  retryDelay?: number;
  consumers: ConsumerRegistration[];
}

/**
 * Declarative entry point for putting a module on the bus: asserts its
 * exchange, DLQ and retry infrastructure, then starts every consumer. A
 * module with no consumers still gets its topology, so publishers can send
 * to it before anyone subscribes.
 */
export class ModuleRegistrar {
  private readonly exchangeManager: ExchangeManager;

  private readonly queueManager: QueueManager;

  private readonly retryManager: RetryManager;

  private readonly deadLetterManager: DeadLetterManager;

  private readonly eventConsumer: EventConsumer;

  constructor({
    exchangeManager,
    queueManager,
    retryManager,
    deadLetterManager,
    eventConsumer,
  }: ModuleRegistrarDependencies) {
    this.exchangeManager = exchangeManager;
    this.queueManager = queueManager;
    this.retryManager = retryManager;
    this.deadLetterManager = deadLetterManager;
    this.eventConsumer = eventConsumer;
  }

  async register({
    module,
    retryDelay = 5000,
    consumers,
  }: ModuleRegistration): Promise<void> {
    const messagingModule = new MessagingModule(module);

    /*
    ---------------------------------------
    Exchanges
    ---------------------------------------
    */

    await this.exchangeManager.ensure(messagingModule.exchange);

    /*
    ---------------------------------------
    Dead Letter Infrastructure
    ---------------------------------------
    */

    await this.deadLetterManager.ensure(messagingModule);

    /*
    ---------------------------------------
    Retry Infrastructure (one shared retry queue per module)
    ---------------------------------------
    */

    await this.retryManager.ensure({
      module: messagingModule,
      retryDelay,
    });

    /*
    ---------------------------------------
    Consumers
    ---------------------------------------
    */

    for (const consumer of consumers) {
      await this.queueManager.ensureAndBind({
        queue: consumer.queue,

        exchange: messagingModule.exchange,

        routingKey: consumer.routingKey,

        options: {
          arguments: {
            "x-dead-letter-exchange": messagingModule.deadLetterExchange,

            "x-dead-letter-routing-key": messagingModule.deadLetterRoutingKey,
          },
        },
      });

      await this.eventConsumer.consume({
        queue: consumer.queue,

        handler: consumer.handler,

        module: messagingModule,

        routingKey: consumer.routingKey,

        prefetch: consumer.prefetch ?? 10,

        ...(consumer.maxRetries !== undefined
          ? { maxRetries: consumer.maxRetries }
          : {}),
      });
    }
  }
}
