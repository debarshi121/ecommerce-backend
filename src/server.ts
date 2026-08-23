// src/server.ts

import http from "http";

import "dotenv/config";

import { createApp } from "./app/createApp";

import { PostgresClient } from "./infrastructure/postgres/PostgresClient";
import { RedisClient } from "./infrastructure/redis/RedisClient";
import { RabbitMQClient } from "./infrastructure/rabbitmq/RabbitMQClient";
import { SocketServer } from "./infrastructure/websocket/SocketServer";
import { logger } from "./infrastructure/logging/Logger";

import { registerDependencies } from "./bootstrap/registerDependencies";
import { registerWorkers } from "./bootstrap/registerWorkers";
import { registerMessaging } from "./bootstrap/registerMessaging";
import { registerJobs } from "./bootstrap/registerJobs";
import { registerGracefulShutdown } from "./bootstrap/registerGracefulShutdown";

const PORT = Number(process.env.PORT || 3000);

async function bootstrap(): Promise<void> {
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
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    await logger.flush();
    process.exit(1);
  }
}

void bootstrap();
