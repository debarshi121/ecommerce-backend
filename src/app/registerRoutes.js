// src/app/registerRoutes.js

const PostgresClient = require(
    "../infrastructure/postgres/PostgresClient"
);

const RedisClient = require(
    "../infrastructure/redis/RedisClient"
);

const CacheService = require(
    "../infrastructure/redis/CacheService"
);

const EventPublisher = require(
    "../infrastructure/rabbitmq/EventPublisher"
);

const RabbitMQClient = require(
    "../infrastructure/rabbitmq/RabbitMQClient"
);

function registerRoutes(app) {

    app.get("/publish-test", async (req, res) => {
        const rabbit =
            RabbitMQClient.getInstance();

        const publisher =
            new EventPublisher(rabbit);

        await publisher.publish(
            "order.exchange",
            "order.created",
            {
                orderId: 123,
                amount: 500
            }
        );

        return res.json({
            success: true
        });
    });

    app.get("/health", async (req, res) => {
        try {
            const db = PostgresClient.getInstance();


            const result = await db.query(
                "SELECT NOW()"
            );

            const redis = RedisClient.getInstance();

            const cache = new CacheService(redis);

            await cache.set(
                "health-check",
                { status: "ok" },
                60
            );

            const redisResult =
                await cache.get("health-check");

            return res.status(200).json({
                success: true,
                dbTime: result.rows[0].now,
                redis: redisResult
            });

        } catch (error) {
            return res.status(500).json({
                success: false
            });
        }
    });


}

module.exports = registerRoutes;