// src/infrastructure/postgres/PostgresTransactionManager.js

class PostgresTransactionManager {
  constructor(postgresClient) {
    this.postgresClient = postgresClient;
  }

  async runInTransaction(callback) {
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
}

module.exports = PostgresTransactionManager;
