// src/server.js

const http = require("http");

require("dotenv").config();

const createApp = require("./app/createApp");

const PostgresClient = require("./infrastructure/postgres/PostgresClient");
const RedisClient = require("./infrastructure/redis/RedisClient");
const RabbitMQClient = require("./infrastructure/rabbitmq/RabbitMQClient");
const SocketServer = require("./infrastructure/websocket/SocketServer");
const logger = require("./infrastructure/logging/Logger");

const registerDependencies = require("./bootstrap/registerDependencies");
const registerWorkers = require("./bootstrap/registerWorkers");
const registerMessaging = require("./bootstrap/registerMessaging");
const registerJobs = require("./bootstrap/registerJobs");
const registerGracefulShutdown = require("./bootstrap/registerGracefulShutdown");

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
     Set up event bus topology and start consumers
     (must happen before workers/jobs, which may publish)
     ----------------------------------
    */

    await registerMessaging(dependencies);

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
     Start background workers
     ----------------------------------
    */

    const workers = registerWorkers(dependencies);

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
      logger.info(`Server running on ${PORT}`);
    });

    /*
     ----------------------------------
     Register graceful shutdown
     ----------------------------------
    */

    registerGracefulShutdown({
      server,
      postgres: db,
      redis,
      rabbit,
      socket,
      workers,
    });
  } catch (error) {
    logger.error("Bootstrap failed", {
      error: error.message,
      stack: error.stack,
    });
    await logger.flush();
    process.exit(1);
  }
}

bootstrap();
