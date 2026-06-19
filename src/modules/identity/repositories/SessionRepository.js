// src/modules/identity/repositories/SessionRepository.js

class SessionRepository {
  constructor(postgresClient) {
    this.db = postgresClient;
  }

  async create(session, tx = null) {
    const query = `
      INSERT INTO sessions (
        user_id,
        refresh_token,
        device_name,
        expires_at
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;

    const values = [
      session.userId,
      session.refreshToken,
      session.deviceName,
      session.expiresAt,
    ];

    const executor = tx || this.db;

    const result = await executor.query(query, values);

    return result.rows[0];
  }

  async findByRefreshToken(refreshToken, tx = null) {
    const query = `
      SELECT *
      FROM sessions
      WHERE refresh_token = $1
      LIMIT 1
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [refreshToken]);

    return result.rows[0] || null;
  }

  async findByUserId(userId, tx = null) {
    const query = `
      SELECT *
      FROM sessions
      WHERE user_id = $1
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
      WHERE user_id = $1
    `;

    const executor = tx || this.db;

    await executor.query(query, [userId]);
  }

  async updateRefreshToken(sessionId, newRefreshToken, tx = null) {
    const query = `
      UPDATE sessions
      SET refresh_token = $1
      WHERE id = $2
      RETURNING *
    `;

    const executor = tx || this.db;

    const result = await executor.query(query, [newRefreshToken, sessionId]);

    return result.rows[0];
  }

  async deleteExpiredSessions(tx = null) {
    const query = `
      DELETE FROM sessions
      WHERE expires_at < NOW()
    `;

    const executor = tx || this.db;

    await executor.query(query);
  }
}

module.exports = SessionRepository;
