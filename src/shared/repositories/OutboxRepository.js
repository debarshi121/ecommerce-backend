// src/shared/repositories/OutboxRepository.js

const crypto = require("crypto");

class OutboxRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(event, tx = null) {
    const query = `
      INSERT INTO outbox_events (
        id,
        event_name,
        exchange,
        routing_key,
        payload
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [
      crypto.randomUUID(),

      event.eventName,

      event.exchange,

      event.routingKey,

      JSON.stringify(event.payload),
    ]);

    return result.rows[0];
  }

  async findUnprocessed(limit = 20, tx = null) {
    const query = `
      SELECT *
      FROM outbox_events
      WHERE processed = false
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [limit]);

    return result.rows;
  }

  async markProcessed(eventId, tx = null) {
    const query = `
      UPDATE outbox_events

      SET processed = true

      WHERE id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [eventId]);
  }
}

module.exports = OutboxRepository;
