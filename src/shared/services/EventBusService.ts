// src/shared/services/EventBusService.ts

import type { IEventBusService, IEventPublisher } from "../contracts";
import type { PublishableEvent } from "../types/events";

export interface EventBusServiceDependencies {
  eventPublisher: IEventPublisher;
}

/**
 * Thin seam between "the outbox has an event to send" and the concrete
 * broker client. Keeping it separate means `PublishOutboxJob` never imports
 * anything RabbitMQ-shaped.
 */
export class EventBusService implements IEventBusService {
  private readonly eventPublisher: IEventPublisher;

  constructor({ eventPublisher }: EventBusServiceDependencies) {
    this.eventPublisher = eventPublisher;
  }

  async publish(event: PublishableEvent): Promise<void> {
    await this.eventPublisher.publish({
      eventId: event.eventId,
      module: event.module,
      routingKey: event.routingKey,
      eventName: event.eventName,
      payload: event.payload,
    });
  }
}
