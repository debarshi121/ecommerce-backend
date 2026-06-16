// src/infrastructure/postgres/PostgresClient.js

const { Pool } = require("pg");

class PostgresClient {
    static instance = null;

    constructor() {
        if (PostgresClient.instance) {
            return PostgresClient.instance;
        }

        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            max: 20,                // max connections
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });

        PostgresClient.instance = this;
    }

    async connect() {
        try {
            const client = await this.pool.connect();

            console.log("PostgreSQL connected");

            client.release();
        } catch (error) {
            console.error("PostgreSQL connection failed", error);
            throw error;
        }
    }

    async query(text, params = []) {
        return this.pool.query(text, params);
    }

    getPool() {
        return this.pool;
    }

    static getInstance() {
        if (!PostgresClient.instance) {
            PostgresClient.instance = new PostgresClient();
        }

        return PostgresClient.instance;
    }
}

module.exports = PostgresClient;