// src/infrastructure/redis/CacheService.ts

import type { RedisClientType } from "redis";

import type { ICacheService } from "../../shared/contracts";
import type { RedisClient } from "./RedisClient";

/**
 * JSON-serialising key/value cache. Callers name their own key space
 * (`identity:otp:*`, `blacklist:*`), so this stays a dumb, reusable port.
 */
export class CacheService implements ICacheService {
  private readonly redis: RedisClientType;

  constructor(redisClient: RedisClient) {
    this.redis = redisClient.getClient();
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds: number | null = null,
  ): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, serialized, {
        EX: ttlSeconds,
      });

      return;
    }

    await this.redis.set(key, serialized);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);

    return Boolean(result);
  }
}
