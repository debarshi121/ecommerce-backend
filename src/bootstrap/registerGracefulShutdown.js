// src/bootstrap/registerGracefulShutdown.js

const logger = require("../infrastructure/logging/Logger");

function registerGracefulShutdown({
  server,
  postgres,
  redis,
  rabbit,
  socket,
  workers = [],
}) {
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      /*
       * Stop accepting new HTTP requests
       */
      await new Promise((resolve) => {
        server.close(resolve);
      });

      logger.info("HTTP server closed");

      /*
       * Close websocket server
       */
      if (socket) {
        await socket.close();

        logger.info("Socket server closed");
      }

      /*
       * Close background workers
       */
      for (const worker of workers) {
        if (worker?.close) {
          await worker.close();
        }
      }

      logger.info("Workers stopped");

      /*
       * Close RabbitMQ
       */
      if (rabbit?.close) {
        await rabbit.close();

        logger.info("RabbitMQ disconnected");
      }

      /*
       * Close Redis
       */
      if (redis?.disconnect) {
        await redis.disconnect();

        logger.info("Redis disconnected");
      }

      /*
       * Close PostgreSQL
       */
      if (postgres?.disconnect) {
        await postgres.disconnect();

        logger.info("PostgreSQL disconnected");
      }

      logger.info("Graceful shutdown complete");

      await logger.flush();

      process.exit(0);
    } catch (error) {
      logger.error("Graceful shutdown failed", {
        error,
      });

      await logger.flush();

      process.exit(1);
    }
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = registerGracefulShutdown;
