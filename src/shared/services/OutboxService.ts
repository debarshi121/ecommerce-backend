// src/shared/services/OutboxService.ts

import type { IOutboxRepository, IOutboxService } from "../contracts";
import type { MaybeTransaction } from "../types/database";
import type { OutboxEventRow } from "../types/entities";
import type { DomainEventInput } from "../types/events";

export interface OutboxServiceDependencies {
  outboxRepository: IOutboxRepository;
}

export class OutboxService implements IOutboxService {
  private readonly outboxRepository: IOutboxRepository;

  constructor({ outboxRepository }: OutboxServiceDependencies) {
    this.outboxRepository = outboxRepository;
  }

  async addEvent(
    event: DomainEventInput,
    tx: MaybeTransaction = null,
  ): Promise<OutboxEventRow> {
    return this.outboxRepository.create(
      {
        eventName: event.eventName,

        module: event.module,

        routingKey: event.routingKey,

        payload: event.payload,
      },

      tx,
    );
  }

  async getUnprocessedEvents(limit = 20): Promise<OutboxEventRow[]> {
    return this.outboxRepository.findUnprocessed(limit);
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.outboxRepository.markProcessed(eventId);
  }
}
