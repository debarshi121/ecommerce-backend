// src/server.js
const http = require("http");

require("dotenv").config();

const createApp = require("./app/createApp");

const PostgresClient = require(
    "./infrastructure/postgres/PostgresClient"
);

const RedisClient = require(
    "./infrastructure/redis/RedisClient"
);

const RabbitMQClient = require(
    "./infrastructure/rabbitmq/RabbitMQClient"
);

const SocketServer =
    require("./infrastructure/websocket/SocketServer");

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    try {
        const db = PostgresClient.getInstance();
        await db.connect();

        const redis = RedisClient.getInstance();
        await redis.connect();

        const rabbit = RabbitMQClient.getInstance();
        await rabbit.connect();

        const app = createApp();

        const server =
            http.createServer(app);

        const socket =
            SocketServer.getInstance();

        socket.initialize(server);

        server.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

bootstrap();