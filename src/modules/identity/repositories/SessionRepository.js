// src/modules/identity/repositories/SessionRepository.js

class SessionRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(session, tx = null) {
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

    const executor = tx || this.db;

    const result = await executor.query(query, values);

    return result.rows[0];
  }

  async findByRefreshTokenHash(refreshTokenHash, tx = null) {
    const query = `
      SELECT *
      FROM sessions
      WHERE "refreshTokenHash" = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [refreshTokenHash]);

    return result.rows[0] || null;
  }

  async findByUserId(userId, tx = null) {
    const query = `
      SELECT *
      FROM sessions
      WHERE "userId" = $1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [userId]);

    return result.rows;
  }

  async deleteById(sessionId, tx = null) {
    const query = `
      DELETE FROM sessions
      WHERE id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [sessionId]);
  }

  async deleteByUserId(userId, tx = null) {
    const query = `
      DELETE FROM sessions
      WHERE "userId" = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [userId]);
  }

  async updateRefreshTokenHash(sessionId, newRefreshTokenHash, tx = null) {
    const query = `
      UPDATE sessions
      SET "refreshTokenHash" = $1
      WHERE id = $2
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [
      newRefreshTokenHash,
      sessionId,
    ]);

    return result.rows[0];
  }

  async deleteExpiredSessions(tx = null) {
    const query = `
      DELETE FROM sessions
      WHERE "expiresAt" < NOW()
    `;

    const executor = tx || this.db;

    await executor.query(query);
  }

  async deleteExpired(tx = null) {
    const query = `
    DELETE FROM sessions
    WHERE "expiresAt" < NOW()
  `;

    const executor = tx || this.db;

    await executor.query(query);
  }
}

module.exports = SessionRepository;
