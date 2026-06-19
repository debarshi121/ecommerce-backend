// src/infrastructure/postgres/PostgresTransactionManager.js

class PostgresTransactionManager {
  constructor(postgresClient) {
    this.postgresClient = postgresClient;
  }

  async execute(callback) {
    const client = await this.postgresClient.getPool().connect();

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
}

module.exports = PostgresTransactionManager;
