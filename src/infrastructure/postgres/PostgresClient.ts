// src/infrastructure/postgres/PostgresClient.ts

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { postgresConfig } from "../../config/postgres";
import type { QueryExecutor } from "../../shared/types/database";

/**
 * Owns the single connection pool for the process.
 *
 * Implements `QueryExecutor`, so repositories can be handed either this
 * (autocommit, pooled) or a checked-out `PoolClient` (inside a transaction)
 * and behave identically.
 */
export class PostgresClient implements QueryExecutor {
  private static instance: PostgresClient | null = null;

  private readonly pool: Pool;

  private constructor() {
    this.pool = new Pool(postgresConfig);
  }

  static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }

    return PostgresClient.instance;
  }

  async verifyConnection(): Promise<boolean> {
    const client = await this.pool.connect();

    client.release();

    return true;
  }

  async connect(): Promise<void> {
    await this.verifyConnection();
  }

  async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<R>> {
    return this.pool.query<R>(text, params);
  }

  /** Checks out a dedicated connection — callers must release it. */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /** Alias of {@link close}, for symmetry with the other clients. */
  async disconnect(): Promise<void> {
    await this.close();
  }
}
