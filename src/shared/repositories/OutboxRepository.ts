// src/shared/repositories/OutboxRepository.ts

import crypto from "crypto";

import type { IOutboxRepository } from "../contracts";
import type { MaybeTransaction, QueryExecutor } from "../types/database";
import type { DomainEventInput } from "../types/events";
import type { OutboxEventRow } from "../types/entities";
import { firstOrFail } from "../utils/rows";

export class OutboxRepository implements IOutboxRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    event: DomainEventInput,
    tx: MaybeTransaction = null,
  ): Promise<OutboxEventRow> {
    const query = `
      INSERT INTO outbox_events (
        id,
        "eventName",
        module,
        "routingKey",
        payload
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<OutboxEventRow>(query, [
      crypto.randomUUID(),

      event.eventName,

      event.module,

      event.routingKey,

      JSON.stringify(event.payload),
    ]);

    return firstOrFail(result, "OutboxRepository.create");
  }

  async findUnprocessed(
    limit = 20,
    tx: MaybeTransaction = null,
  ): Promise<OutboxEventRow[]> {
    const query = `
      SELECT *
      FROM outbox_events
      WHERE processed = false
      ORDER BY "createdAt" ASC
      LIMIT $1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<OutboxEventRow>(query, [limit]);

    return result.rows;
  }

  async markProcessed(
    eventId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      UPDATE outbox_events

      SET processed = true

      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [eventId]);
  }
}
