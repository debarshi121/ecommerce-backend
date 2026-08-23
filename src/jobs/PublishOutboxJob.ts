// src/jobs/PublishOutboxJob.ts

import { logger } from "../infrastructure/logging/Logger";
import type { IEventBusService, IOutboxService } from "../shared/contracts";
import type { EventName } from "../shared/constants/EventNames";
import type { RabbitModule } from "../shared/constants/RabbitModules";
import type { RoutingKey } from "../shared/constants/RoutingKeys";

const BATCH_SIZE = 20;

export interface PublishOutboxJobDependencies {
  outboxService: IOutboxService;
  eventBusService: IEventBusService;
}

/**
 * The other half of the transactional outbox: reads events that were
 * committed alongside their business data and pushes them onto the bus,
 * marking each processed only after a successful publish. A failure leaves
 * the row unprocessed, so the next tick retries it — at-least-once delivery,
 * which is exactly why consumers dedupe through the inbox.
 */
export class PublishOutboxJob {
  private readonly outboxService: IOutboxService;

  private readonly eventBusService: IEventBusService;

  constructor({
    outboxService,
    eventBusService,
  }: PublishOutboxJobDependencies) {
    this.outboxService = outboxService;
    this.eventBusService = eventBusService;
  }

  async handle(): Promise<void> {
    const pendingEvents =
      await this.outboxService.getUnprocessedEvents(BATCH_SIZE);

    for (const event of pendingEvents) {
      try {
        await this.eventBusService.publish({
          eventId: event.id,
          eventName: event.eventName as EventName,
          module: event.module as RabbitModule,
          routingKey: event.routingKey as RoutingKey,
          payload: event.payload,
        });

        await this.outboxService.markProcessed(event.id);

        logger.info("Outbox event published", {
          eventId: event.id,
          eventName: event.eventName,
          routingKey: event.routingKey,
        });
      } catch (error) {
        logger.error("Failed to publish outbox event", {
          eventId: event.id,
          eventName: event.eventName,
          routingKey: event.routingKey,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Leave unprocessed so the job retries later.
      }
    }
  }
}
