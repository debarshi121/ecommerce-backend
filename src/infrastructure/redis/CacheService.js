// src/infrastructure/redis/CacheService.js

class CacheService {
  constructor(redisClient) {
    this.redis = redisClient.getClient();
  }

  async set(key, value, ttl = null) {
    const serialized = JSON.stringify(value);

    if (ttl) {
      await this.redis.set(key, serialized, {
        EX: ttl,
      });

      return;
    }

    await this.redis.set(key, serialized);
  }

  async get(key) {
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  }

  async delete(key) {
    await this.redis.del(key);
  }

  async exists(key) {
    const result = await this.redis.exists(key);

    return Boolean(result);
  }
}

module.exports = CacheService;
