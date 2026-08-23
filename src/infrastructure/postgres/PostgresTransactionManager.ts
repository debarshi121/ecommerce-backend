// src/infrastructure/postgres/PostgresTransactionManager.ts

import type {
  ITransactionManager,
  Transaction,
} from "../../shared/types/database";
import type { PostgresClient } from "./PostgresClient";

/**
 * Postgres implementation of the unit-of-work boundary: checks out one
 * connection, wraps the callback in BEGIN/COMMIT, rolls back on any throw,
 * and always releases the connection.
 */
export class PostgresTransactionManager implements ITransactionManager {
  private readonly postgresClient: PostgresClient;

  constructor(postgresClient: PostgresClient) {
    this.postgresClient = postgresClient;
  }

  async runInTransaction<T>(
    callback: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    const client = await this.postgresClient.getClient();

    try {
      await client.query("BEGIN");

      const result = await callback(client);

      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      throw error;
    } finally {
      client.release();
    }
  }

  async execute<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runInTransaction(callback);
  }
}
