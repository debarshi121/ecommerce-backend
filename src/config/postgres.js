// src/config/postgres.js

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  throw new Error("Postgres env variables missing");
}

module.exports = {
  host: process.env.DB_HOST,

  port: Number(process.env.DB_PORT),

  user: process.env.DB_USER,

  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME,

  max: 20,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 5000,
};
