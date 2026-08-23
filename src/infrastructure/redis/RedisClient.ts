// src/infrastructure/redis/RedisClient.ts

import { createClient, type RedisClientType } from "redis";

import { logger } from "../logging/Logger";

export class RedisClient {
  private static instance: RedisClient | null = null;

  private readonly client: RedisClientType;

  private constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }) as RedisClientType;

    this.client.on("connect", () => {
      logger.info("Redis connected");
    });

    this.client.on("error", (error: unknown) => {
      logger.error("Redis client error", {
        error,
      });
    });
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }

    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
