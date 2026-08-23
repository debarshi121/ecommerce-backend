// src/bootstrap/registerGracefulShutdown.ts

import type { Server } from "http";

import { logger } from "../infrastructure/logging/Logger";
import type { PostgresClient } from "../infrastructure/postgres/PostgresClient";
import type { RabbitMQClient } from "../infrastructure/rabbitmq/RabbitMQClient";
import type { RedisClient } from "../infrastructure/redis/RedisClient";
import type { SocketServer } from "../infrastructure/websocket/SocketServer";
import type { Closable } from "../workers/OutboxWorker";

export interface ShutdownTargets {
  server: Server;
  postgres: PostgresClient;
  redis: RedisClient;
  rabbit: RabbitMQClient;
  socket: SocketServer;
  workers?: Closable[];
}

type Signal = "SIGINT" | "SIGTERM";

const SIGNALS: Signal[] = ["SIGINT", "SIGTERM"];

/**
 * Drains the process in dependency order — stop accepting traffic, finish
 * in-flight work, then close the connections that work depended on.
 *
 * Each target is typed, so a rename can no longer silently turn a close step
 * into a no-op (the previous `postgres?.disconnect` guard did exactly that).
 */
export function registerGracefulShutdown({
  server,
  postgres,
  redis,
  rabbit,
  socket,
  workers = [],
}: ShutdownTargets): void {
  let shuttingDown = false;

  async function shutdown(signal: Signal): Promise<void> {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      /*
       * Stop accepting new HTTP requests
       */
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });

      logger.info("HTTP server closed");

      /*
       * Close websocket server
       */
      await socket.close();

      logger.info("Socket server closed");

      /*
       * Close background workers
       */
      for (const worker of workers) {
        await worker.close();
      }

      logger.info("Workers stopped");

      /*
       * Close RabbitMQ
       */
      await rabbit.close();

      logger.info("RabbitMQ disconnected");

      /*
       * Close Redis
       */
      await redis.disconnect();

      logger.info("Redis disconnected");

      /*
       * Close PostgreSQL
       */
      await postgres.disconnect();

      logger.info("PostgreSQL disconnected");

      logger.info("Graceful shutdown complete");

      await logger.flush();

      process.exit(0);
    } catch (error) {
      logger.error("Graceful shutdown failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      await logger.flush();

      process.exit(1);
    }
  }

  SIGNALS.forEach((signal) => {
    process.on(signal, () => {
      void shutdown(signal);
    });
  });
}
