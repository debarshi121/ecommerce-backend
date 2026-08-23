// src/shared/types/database.ts

import type { PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * The narrow slice of a Postgres client that repositories actually need.
 *
 * Both the pooled `PostgresClient` singleton and a per-transaction
 * `pg.PoolClient` satisfy it, which is what makes the repository-wide
 * `executor = tx ?? this.db` idiom type-safe: a repository cannot tell (and
 * must not care) whether it is running inside a transaction.
 */
export interface QueryExecutor {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<R>>;
}

/** An open transaction handle, threaded through service -> repository calls. */
export type Transaction = PoolClient;

/** Optional transaction: `null` means "run on the pool, autocommit". */
export type MaybeTransaction = Transaction | null;

/**
 * Unit-of-work boundary. Services depend on this interface rather than on
 * `PostgresTransactionManager`, so the persistence technology stays
 * replaceable and tests can hand in a fake.
 */
export interface ITransactionManager {
  runInTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
  execute<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
}
