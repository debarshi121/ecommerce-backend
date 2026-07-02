// src/server.js

const http = require("http");

require("dotenv").config();

const createApp = require("./app/createApp");

const PostgresClient = require("./infrastructure/postgres/PostgresClient");
const RedisClient = require("./infrastructure/redis/RedisClient");
const RabbitMQClient = require("./infrastructure/rabbitmq/RabbitMQClient");
const SocketServer = require("./infrastructure/websocket/SocketServer");

const registerDependencies = require("./bootstrap/registerDependencies");

const registerJobs = require("./bootstrap/registerJobs");
const registerWorkers = require("./bootstrap/registerWorkers");

const EventPublisher = require("./infrastructure/rabbitmq/EventPublisher");

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    /*
     ----------------------------------
     Connect infrastructure
     ----------------------------------
    */

    const db = PostgresClient.getInstance();
    await db.connect();

    const redis = RedisClient.getInstance();
    await redis.connect();

    const rabbit = RabbitMQClient.getInstance();
    await rabbit.connect();

    /*
     ----------------------------------
     Build dependency container
     ----------------------------------
    */

    const dependencies = registerDependencies();

    /*
     ----------------------------------
     Assert RabbitMQ exchanges
     ----------------------------------
    */

    const eventPublisher = new EventPublisher(rabbit);
    await eventPublisher.ensureExchange();

    /*
     ----------------------------------
     Create express app
     ----------------------------------
    */

    const app = createApp(dependencies);

    /*
     ----------------------------------
     Create HTTP server
     ----------------------------------
    */

    const server = http.createServer(app);

    /*
     ----------------------------------
     Initialize websocket server
     ----------------------------------
    */

    const socket = SocketServer.getInstance();
    socket.initialize(server);

    /*
     ----------------------------------
     Start background workers first
     ----------------------------------
    */

    registerWorkers(dependencies);

    /*
     ----------------------------------
     Register recurring BullMQ jobs
     ----------------------------------
    */

    await registerJobs();

    /*
     ----------------------------------
     Start server
     ----------------------------------
    */

    server.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  } catch (error) {
    console.error("Bootstrap failed", error);

    process.exit(1);
  }
}

bootstrap();
