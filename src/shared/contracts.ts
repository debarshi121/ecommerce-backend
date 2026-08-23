// src/shared/contracts.ts
//
// Ports shared by more than one module. A service depends on the interface
// declared here; the concrete class in infrastructure/ or shared/ implements
// it. That is what keeps the dependency arrows pointing inward: nothing in a
// module's business logic names a driver (pg, redis, amqplib) directly.

import type {
  DomainEventInput,
  EventEnvelope,
  EventHandler,
  PublishableEvent,
} from "./types/events";
import type { InboxEventRow, OutboxEventRow } from "./types/entities";
import type { MaybeTransaction, Transaction } from "./types/database";

/*
|--------------------------------------------------------------------------
| Caching
|--------------------------------------------------------------------------
*/

export interface ICacheService {
  set(key: string, value: unknown, ttlSeconds?: number | null): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/*
|--------------------------------------------------------------------------
| Messaging
|--------------------------------------------------------------------------
*/

export interface IEventPublisher {
  publish(event: PublishableEvent): Promise<void>;
}

export interface IEventBusService {
  publish(event: PublishableEvent): Promise<void>;
}

/*
|--------------------------------------------------------------------------
| Transactional outbox
|--------------------------------------------------------------------------
*/

export interface IOutboxRepository {
  create(
    event: DomainEventInput,
    tx?: MaybeTransaction,
  ): Promise<OutboxEventRow>;
  findUnprocessed(
    limit?: number,
    tx?: MaybeTransaction,
  ): Promise<OutboxEventRow[]>;
  markProcessed(eventId: string, tx?: MaybeTransaction): Promise<void>;
}

export interface IOutboxService {
  /**
   * Records an event in the same transaction as the state change that caused
   * it. Nothing is sent to RabbitMQ here — `PublishOutboxJob` does that
   * after the transaction commits.
   */
  addEvent(
    event: DomainEventInput,
    tx?: MaybeTransaction,
  ): Promise<OutboxEventRow>;
  getUnprocessedEvents(limit?: number): Promise<OutboxEventRow[]>;
  markProcessed(eventId: string): Promise<void>;
}

/*
|--------------------------------------------------------------------------
| Transactional inbox (consumer-side deduplication)
|--------------------------------------------------------------------------
*/

/** Identity of a consumed event: unique per (eventId, queue) pair. */
export interface InboxEventInput {
  eventId: string;
  eventName: string;
  module: string;
  queue: string;
  payload: unknown;
}

export interface InboxFailureInput extends InboxEventInput {
  lastError?: string | null;
}

export interface IInboxRepository {
  findByEventId(
    eventId: string,
    queue: string,
    tx?: MaybeTransaction,
  ): Promise<InboxEventRow | null>;
  create(
    event: InboxEventInput,
    tx?: MaybeTransaction,
  ): Promise<InboxEventRow | null>;
  markProcessed(
    id: string,
    tx?: MaybeTransaction,
  ): Promise<InboxEventRow | null>;
  markFailed(
    event: InboxFailureInput,
    tx?: MaybeTransaction,
  ): Promise<InboxEventRow | null>;
  updateStatus(
    id: string,
    status: string,
    tx?: MaybeTransaction,
  ): Promise<InboxEventRow | null>;
  deleteOldProcessedEvents(days: number, tx?: MaybeTransaction): Promise<number>;
}

/** Outcome of one idempotent consume attempt. */
export interface ProcessEventResult {
  duplicate: boolean;
  result: unknown;
}

export interface ProcessEventCommand {
  event: EventEnvelope<unknown>;
  module: string;
  queue: string;
  handler: EventHandler;
}

export interface IInboxService {
  isProcessed(eventId: string, queue: string): Promise<boolean>;
  startProcessing(
    event: InboxEventInput,
    tx: Transaction,
  ): Promise<InboxEventRow | null>;
  complete(inboxRecordId: string, tx: Transaction): Promise<InboxEventRow | null>;
  fail(event: InboxEventInput, error: unknown): Promise<InboxEventRow | null>;
  processEvent(command: ProcessEventCommand): Promise<ProcessEventResult>;
}
