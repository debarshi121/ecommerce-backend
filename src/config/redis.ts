// src/config/redis.ts

export interface RedisConfig {
  host: string | undefined;
  port: number;
}

/**
 * Shape accepted both by BullMQ (`connection`) and by our own Redis client
 * wrapper, so queues and the cache always point at the same instance.
 */
export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST,

  port: Number(process.env.REDIS_PORT),
};
