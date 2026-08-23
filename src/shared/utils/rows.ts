// src/shared/utils/rows.ts

import type { QueryResult, QueryResultRow } from "pg";
import { InternalServerError } from "../errors/InternalServerError";
import type { WindowCounted } from "../types/entities";

/**
 * `result.rows[0]` is `T | undefined` under `noUncheckedIndexedAccess`.
 * These three helpers turn that into the three intents a repository
 * actually has, so the ambiguity is resolved once here instead of with an
 * assertion at every call site.
 */

/** "Zero or one row expected" — the finder case. */
export function firstOrNull<R extends QueryResultRow>(
  result: QueryResult<R>,
): R | null {
  return result.rows[0] ?? null;
}

/**
 * "Exactly one row guaranteed by the statement" — an INSERT ... RETURNING,
 * or an aggregate that always produces a row. A missing row means the
 * statement and this code have drifted apart, which is a defect, not a
 * not-found.
 */
export function firstOrFail<R extends QueryResultRow>(
  result: QueryResult<R>,
  context: string,
): R {
  const row = result.rows[0];

  if (!row) {
    throw new InternalServerError(`${context}: expected a row, got none`);
  }

  return row;
}

/**
 * Splits a `SELECT *, COUNT(*) OVER() AS "totalCount"` result into the page
 * of rows and the total count, dropping the window column from each row.
 */
export function toPage<R extends QueryResultRow>(
  result: QueryResult<R & WindowCounted>,
): { items: R[]; total: number } {
  const first = result.rows[0];

  const total = first ? Number(first.totalCount) : 0;

  const items = result.rows.map((row) => {
    const { totalCount: _totalCount, ...rest } = row;

    return rest as unknown as R;
  });

  return { items, total };
}
