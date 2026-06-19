// src/infrastructure/redis/CacheService.js

class CacheService {
    constructor(redisClient) {
        this.redis = redisClient.getClient();
    }

    async set(key, value, ttl = 3600) {
        await this.redis.set(
            key,
            JSON.stringify(value),
            {
                EX: ttl
            }
        );
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