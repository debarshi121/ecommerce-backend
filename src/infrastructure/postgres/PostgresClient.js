// src/infrastructure/postgres/PostgresClient.js

const { Pool } = require("pg");
const postgresConfig = require("../../config/postgres");

class PostgresClient {
  static instance = null;

  constructor() {
    this.pool = new Pool(postgresConfig);
  }

  async verifyConnection() {
    const client = await this.pool.connect();

    client.release();

    return true;
  }

  async connect() {
    await this.verifyConnection();
  }

  async query(text, params = []) {
    return this.pool.query(text, params);
  }

  async getClient() {
    return this.pool.connect();
  }

  async close() {
    await this.pool.end();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new PostgresClient();
    }

    return this.instance;
  }
}

module.exports = PostgresClient;
