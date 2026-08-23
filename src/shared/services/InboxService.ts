// src/shared/services/InboxService.ts

import { logger } from "../../infrastructure/logging/Logger";

import { InboxStatus } from "../constants/InboxStatus";
import type {
  IInboxRepository,
  IInboxService,
  InboxEventInput,
  ProcessEventCommand,
  ProcessEventResult,
} from "../contracts";
import type { ITransactionManager, Transaction } from "../types/database";
import type { InboxEventRow } from "../types/entities";

export interface InboxServiceDependencies {
  inboxRepository: IInboxRepository;
  transactionManager: ITransactionManager;
}

export class InboxService implements IInboxService {
  private readonly inboxRepository: IInboxRepository;

  private readonly transactionManager: ITransactionManager;

  constructor({
    inboxRepository,
    transactionManager,
  }: InboxServiceDependencies) {
    this.inboxRepository = inboxRepository;
    this.transactionManager = transactionManager;
  }

  // Cheap pre-check so a known duplicate never has to pay for a pool
  // checkout + BEGIN. This is an optimization only — the INSERT ... ON
  // CONFLICT performed by startProcessing() is what actually guarantees
  // correctness under concurrent/racing redelivery.
  async isProcessed(eventId: string, queue: string): Promise<boolean> {
    const record = await this.inboxRepository.findByEventId(eventId, queue);

    return Boolean(record && record.status === InboxStatus.PROCESSED);
  }

  // Must be called with the transaction client that will also be used to
  // run the handler. Returns the inbox row on success, or null when the
  // event has already been fully processed (the duplicate case).
  async startProcessing(
    { eventId, eventName, module, queue, payload }: InboxEventInput,
    tx: Transaction,
  ): Promise<InboxEventRow | null> {
    return this.inboxRepository.create(
      { eventId, eventName, module, queue, payload },
      tx,
    );
  }

  async complete(
    inboxRecordId: string,
    tx: Transaction,
  ): Promise<InboxEventRow | null> {
    return this.inboxRepository.markProcessed(inboxRecordId, tx);
  }

  // Called after RetryStrategy has exhausted retries and routed the
  // message to the dead letter queue. Intentionally NOT part of the
  // business transaction (that transaction already rolled back) — this is
  // a best-effort audit write on its own connection.
  async fail(
    { eventId, eventName, module, queue, payload }: InboxEventInput,
    error: unknown,
  ): Promise<InboxEventRow | null> {
    try {
      return await this.inboxRepository.markFailed({
        eventId,
        eventName,
        module,
        queue,
        payload,
        lastError: error instanceof Error ? error.message : String(error),
      });
    } catch (persistError) {
      logger.error("Failed to persist inbox FAILED record", {
        eventId,
        eventName,
        queue,
        error:
          persistError instanceof Error
            ? persistError.message
            : String(persistError),
        stack: persistError instanceof Error ? persistError.stack : undefined,
      });

      return null;
    }
  }

  // Orchestrates the full idempotent-consume flow:
  //   isProcessed() fast path -> BEGIN -> startProcessing() -> handler() ->
  //   complete() -> COMMIT
  // Returns { duplicate, result }. Never throws for a duplicate — only a
  // genuine handler/database failure propagates, so the caller (EventConsumer)
  // can hand it to RetryStrategy.
  async processEvent({
    event,
    module,
    queue,
    handler,
  }: ProcessEventCommand): Promise<ProcessEventResult> {
    const alreadyProcessed = await this.isProcessed(event.eventId, queue);

    if (alreadyProcessed) {
      logger.warn("Duplicate event ignored (already processed)", {
        eventId: event.eventId,
        eventName: event.eventName,
        queue,
      });

      return { duplicate: true, result: null };
    }

    return this.transactionManager.execute(async (tx) => {
      const inboxRecord = await this.startProcessing(
        {
          eventId: event.eventId,
          eventName: event.eventName,
          module,
          queue,
          payload: event.payload,
        },
        tx,
      );

      if (!inboxRecord) {
        logger.warn("Duplicate event ignored (concurrent delivery)", {
          eventId: event.eventId,
          eventName: event.eventName,
          queue,
        });

        return { duplicate: true, result: null };
      }

      const result = await handler(event, tx);

      await this.complete(inboxRecord.id, tx);

      return { duplicate: false, result };
    });
  }
}
