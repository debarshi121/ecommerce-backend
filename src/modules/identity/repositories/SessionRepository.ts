// src/modules/identity/repositories/SessionRepository.ts

import type { MaybeTransaction, QueryExecutor } from "../../../shared/types/database";
import type { SessionRow } from "../../../shared/types/entities";
import { firstOrFail, firstOrNull } from "../../../shared/utils/rows";
import type { CreateSessionRow, ISessionRepository } from "../contracts";

export class SessionRepository implements ISessionRepository {
  private readonly db: QueryExecutor;

  constructor(postgresClient: QueryExecutor) {
    this.db = postgresClient;
  }

  async create(
    session: CreateSessionRow,
    tx: MaybeTransaction = null,
  ): Promise<SessionRow> {
    const query = `
      INSERT INTO sessions (
        "userId",
        "refreshTokenHash",
        "deviceName",
        "expiresAt"
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [
      session.userId,
      session.refreshTokenHash,
      session.deviceName,
      session.expiresAt,
    ];

    const executor = tx ?? this.db;

    const result = await executor.query<SessionRow>(query, values);

    return firstOrFail(result, "SessionRepository.create");
  }

  async findByRefreshTokenHash(
    refreshTokenHash: string,
    tx: MaybeTransaction = null,
  ): Promise<SessionRow | null> {
    const query = `
      SELECT *
      FROM sessions
      WHERE "refreshTokenHash" = $1
      LIMIT 1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<SessionRow>(query, [refreshTokenHash]);

    return firstOrNull(result);
  }

  async findByUserId(
    userId: string,
    tx: MaybeTransaction = null,
  ): Promise<SessionRow[]> {
    const query = `
      SELECT *
      FROM sessions
      WHERE "userId" = $1
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<SessionRow>(query, [userId]);

    return result.rows;
  }

  async deleteById(
    sessionId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      DELETE FROM sessions
      WHERE id = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [sessionId]);
  }

  async deleteByUserId(
    userId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    const query = `
      DELETE FROM sessions
      WHERE "userId" = $1
    `;

    const executor = tx ?? this.db;

    await executor.query(query, [userId]);
  }

  async updateRefreshTokenHash(
    sessionId: string,
    newRefreshTokenHash: string,
    tx: MaybeTransaction = null,
  ): Promise<SessionRow> {
    const query = `
      UPDATE sessions
      SET "refreshTokenHash" = $1
      WHERE id = $2
      RETURNING *
    `;

    const executor = tx ?? this.db;

    const result = await executor.query<SessionRow>(query, [
      newRefreshTokenHash,
      sessionId,
    ]);

    return firstOrFail(result, "SessionRepository.updateRefreshTokenHash");
  }

  async deleteExpired(tx: MaybeTransaction = null): Promise<void> {
    const query = `
      DELETE FROM sessions
      WHERE "expiresAt" < NOW()
    `;

    const executor = tx ?? this.db;

    await executor.query(query);
  }
}
