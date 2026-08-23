// src/shared/utils/sqlUpdate.ts

/** Maps a patch key onto the (possibly quoted) column it writes. */
export type ColumnMap<TPatch> = Partial<Record<keyof TPatch & string, string>>;

/** Per-key value transform, e.g. JSON.stringify for a JSONB column. */
export type ValueEncoders<TPatch> = Partial<
  Record<keyof TPatch & string, (value: unknown) => unknown>
>;

export interface UpdateAssignments {
  /** e.g. ['name = $2', '"parentId" = $3'] */
  assignments: string[];
  /** Positional values, aligned with the assignments. */
  values: unknown[];
}

/**
 * Turns a partial patch into the SET fragment of an UPDATE.
 *
 * Shared by every repository that supports partial updates so the
 * allow-listing rule lives in one place: a key absent from `columnMap` is
 * silently ignored, which is what keeps client-supplied objects from
 * reaching the SQL text.
 *
 * `firstParamIndex` is the placeholder number to start at — callers pass 2
 * because `$1` is the row id in the WHERE clause.
 */
export function buildUpdateAssignments<TPatch extends object>(
  fields: TPatch,
  columnMap: ColumnMap<TPatch>,
  options: {
    firstParamIndex?: number;
    encoders?: ValueEncoders<TPatch>;
  } = {},
): UpdateAssignments {
  const { firstParamIndex = 2 } = options;

  const encoders: ValueEncoders<TPatch> = options.encoders ?? {};

  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const key of Object.keys(fields) as (keyof TPatch & string)[]) {
    const column = columnMap[key];

    if (!column) {
      continue;
    }

    const encode = encoders[key];
    const raw = fields[key];

    assignments.push(`${column} = $${firstParamIndex + values.length}`);
    values.push(encode ? encode(raw) : raw);
  }

  return { assignments, values };
}
