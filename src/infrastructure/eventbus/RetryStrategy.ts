// src/infrastructure/eventbus/RetryStrategy.ts

import type { Channel, ConsumeMessage } from "amqplib";

import { logger } from "../logging/Logger";
import type { MessagingModule } from "./MessagingModule";

export interface RetryStrategyOptions {
  maxRetries?: number;
}

export interface HandleRetryCommand {
  message: ConsumeMessage;
  error: unknown;
  module: MessagingModule;
  routingKey: string;
  maxRetries?: number;
}

/**
 * What happened to the failed message: either it was re-published onto the
 * retry exchange of its module (deadLettered: false) or its retry budget was
 * spent and it was nacked into the DLQ (deadLettered: true).
 */
export interface RetryOutcome {
  deadLettered: boolean;
  retryCount: number;
}

const RETRY_COUNT_HEADER = "x-retry-count";

export class RetryStrategy {
  private readonly channel: Channel;

  private readonly defaultMaxRetries: number;

  constructor(channel: Channel, options: RetryStrategyOptions = {}) {
    this.channel = channel;
    this.defaultMaxRetries = options.maxRetries ?? 3;
  }

  async handle({
    message,
    error,
    module,
    routingKey,
    maxRetries,
  }: HandleRetryCommand): Promise<RetryOutcome> {
    const retryLimit = maxRetries ?? this.defaultMaxRetries;

    const retryCount = Number(
      message.properties.headers?.[RETRY_COUNT_HEADER] || 0,
    );

    if (retryCount < retryLimit) {
      this.channel.publish(module.retryExchange, routingKey, message.content, {
        persistent: true,

        headers: {
          ...message.properties.headers,
          [RETRY_COUNT_HEADER]: retryCount + 1,
        },
      });

      logger.warn("Message scheduled for retry", {
        module: module.name,
        routingKey,
        retryCount: retryCount + 1,
        maxRetries: retryLimit,
        error: error instanceof Error ? error.message : String(error),
      });

      this.channel.ack(message);

      return { deadLettered: false, retryCount: retryCount + 1 };
    }

    logger.error("Retry limit exceeded, routing to dead letter queue", {
      module: module.name,
      routingKey,
      retryCount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    this.channel.nack(message, false, false);

    return { deadLettered: true, retryCount };
  }
}
