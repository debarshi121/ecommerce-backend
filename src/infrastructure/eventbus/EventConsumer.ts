// src/infrastructure/eventbus/EventConsumer.ts

import type { Channel } from "amqplib";

import type { IInboxService } from "../../shared/contracts";
import type { EventEnvelope, EventHandler } from "../../shared/types/events";
import { logger } from "../logging/Logger";

import type { MessagingModule } from "./MessagingModule";
import type { RabbitMQClient } from "../rabbitmq/RabbitMQClient";
import type { RetryStrategy } from "./RetryStrategy";

export interface ConsumeCommand {
  queue: string;
  handler: EventHandler;
  module: MessagingModule;
  routingKey: string;
  prefetch?: number;
  maxRetries?: number;
}

/**
 * Binds one queue to one handler and owns the acknowledgement protocol:
 *
 *   parse -> inbox-deduplicated handler -> ack
 *   unparseable    -> nack (straight to DLQ, retrying cannot help)
 *   handler threw  -> RetryStrategy decides retry vs DLQ
 */
export class EventConsumer {
  private readonly channel: Channel;

  private readonly retryStrategy: RetryStrategy;

  private readonly inboxService: IInboxService;

  constructor(
    rabbitClient: RabbitMQClient,
    retryStrategy: RetryStrategy,
    inboxService: IInboxService,
  ) {
    this.channel = rabbitClient.getChannel();
    this.retryStrategy = retryStrategy;
    this.inboxService = inboxService;
  }

  async consume({
    queue,
    handler,
    module,
    routingKey,
    prefetch = 10,
    maxRetries,
  }: ConsumeCommand): Promise<void> {
    await this.channel.prefetch(prefetch);

    void this.channel.consume(queue, async (message) => {
      if (!message) {
        return;
      }

      let event: EventEnvelope<unknown>;

      try {
        // The deserialization trust boundary: past this point the message is
        // typed as EventEnvelope<unknown>, and each registration narrows its
        // own payload before handing it to a module consumer.
        event = JSON.parse(message.content.toString()) as EventEnvelope<unknown>;
      } catch (error) {
        logger.error(
          "Failed to parse event payload, routing to dead letter queue",
          {
            queue,
            routingKey,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );

        this.channel.nack(message, false, false);

        return;
      }

      try {
        const { duplicate } = await this.inboxService.processEvent({
          event,
          module: module.name,
          queue,
          handler,
        });

        if (duplicate) {
          logger.warn("Duplicate event skipped by inbox", {
            queue,
            routingKey,
            eventId: event.eventId,
            eventName: event.eventName,
          });
        }

        this.channel.ack(message);
      } catch (error) {
        logger.error("Event handler failed", {
          queue,
          routingKey,
          eventId: event.eventId,
          eventName: event.eventName,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        const { deadLettered } = await this.retryStrategy.handle({
          message,
          error,
          module,
          routingKey,
          ...(maxRetries !== undefined ? { maxRetries } : {}),
        });

        if (deadLettered) {
          await this.inboxService.fail(
            {
              eventId: event.eventId,
              eventName: event.eventName,
              module: module.name,
              queue,
              payload: event.payload,
            },
            error,
          );
        }
      }
    });

    logger.info("Consumer started", {
      queue,
      prefetch,
    });
  }
}
