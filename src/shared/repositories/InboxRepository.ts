// src/shared/repositories/InboxRepository.ts

import crypto from "crypto";

import { InboxStatus } from "../constants/InboxStatus";
import type {
  IInboxRepository,
  InboxEventInput,
  InboxFailureInput,
} from "../contracts";
import type { MaybeTransaction, QueryExecutor } from "../types/database";
import type { InboxEventRow } from "../types/entities";
import { firstOrNull } from "../utils/rows";

export class InboxRepository implements IInboxRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async findByEventId(
    eventId: string,
    queue: string,
    tx: MaybeTransaction = null,
  ): Promise<InboxEventRow | null> {
    const query = `
      SELECT *
      FROM inbox_events
      WHERE "eventId" = $1 AND queue = $2
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InboxEventRow>(query, [eventId, queue]);

    return firstOrNull(result);
  }

  // Inserts the inbox record for a fresh event, or resurrects a previously
  // FAILED (dead-lettered) record so it can be reprocessed. If a record
  // already exists with status PROCESSED, the WHERE guard on the DO UPDATE
  // clause prevents any row being written and RETURNING yields no row —
  // that "no row" result is how the caller recognizes a duplicate.
  async create(
    event: InboxEventInput,
    tx: MaybeTransaction = null,
  ): Promise<InboxEventRow | null> {
    const query = `
      INSERT INTO inbox_events (
        id,
        "eventId",
        "eventName",
        module,
        queue,
        payload,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT ("eventId", queue)
      DO UPDATE SET
        status      = $7,
        payload     = EXCLUDED.payload,
        "lastError" = NULL,
        "updatedAt" = NOW()
      WHERE inbox_events.status = $8
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InboxEventRow>(query, [
      crypto.randomUUID(),

      event.eventId,

      event.eventName,

      event.module,

      event.queue,

      JSON.stringify(event.payload),

      InboxStatus.PROCESSING,

      InboxStatus.FAILED,
    ]);

    return firstOrNull(result);
  }

  async markProcessed(
    id: string,
    tx: MaybeTransaction = null,
  ): Promise<InboxEventRow | null> {
    const query = `
      UPDATE inbox_events
      SET status = $2, "processedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InboxEventRow>(query, [
      id,
      InboxStatus.PROCESSED,
    ]);

    return firstOrNull(result);
  }

  // Always runs OUTSIDE the business transaction (it is called after that
  // transaction has already rolled back), so it uses its own upsert rather
  // than assuming a row from create() is still around. Guarded so a FAILED
  // write can never clobber a record that was already PROCESSED.
  async markFailed(
    event: InboxFailureInput,
    tx: MaybeTransaction = null,
  ): Promise<InboxEventRow | null> {
    const query = `
      INSERT INTO inbox_events (
        id,
        "eventId",
        "eventName",
        module,
        queue,
        payload,
        status,
        "lastError",
        "processedAt"
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT ("eventId", queue)
      DO UPDATE SET
        status        = $7,
        "lastError"   = EXCLUDED."lastError",
        "processedAt" = NOW(),
        "updatedAt"   = NOW()
      WHERE inbox_events.status != $9
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InboxEventRow>(query, [
      crypto.randomUUID(),

      event.eventId,

      event.eventName,

      event.module,

      event.queue,

      JSON.stringify(event.payload),

      InboxStatus.FAILED,

      event.lastError ?? null,

      InboxStatus.PROCESSED,
    ]);

    return firstOrNull(result);
  }

  async updateStatus(
    id: string,
    status: string,
    tx: MaybeTransaction = null,
  ): Promise<InboxEventRow | null> {
    const query = `
      UPDATE inbox_events
      SET status = $2, "updatedAt" = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<InboxEventRow>(query, [id, status]);

    return firstOrNull(result);
  }

  async deleteOldProcessedEvents(
    days: number,
    tx: MaybeTransaction = null,
  ): Promise<number> {
    const query = `
      DELETE FROM inbox_events
      WHERE status = $1
        AND "processedAt" < NOW() - (INTERVAL '1 day' * $2)
    `;

    const executor = tx ?? this.db;

    const result = await executor.query(query, [InboxStatus.PROCESSED, days]);

    return result.rowCount ?? 0;
  }
}
