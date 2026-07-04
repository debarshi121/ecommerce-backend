// src/infrastructure/redis/RedisClient.js

const { createClient } = require("redis");
const Logger = require("../logging/Logger");
const logger = Logger.getInstance();

class RedisClient {
  static instance = null;

  constructor() {
    if (RedisClient.instance) {
      return RedisClient.instance;
    }

    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
    });

    this.client.on("connect", () => {
      logger.info("Redis connected");
    });

    this.client.on("error", (error) => {
      logger.error("Redis client error", {
        error,
      });
    });

    RedisClient.instance = this;
  }

  async connect() {
    await this.client.connect();
  }

  getClient() {
    return this.client;
  }

  static getInstance() {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }

    return RedisClient.instance;
  }
}

module.exports = RedisClient;
