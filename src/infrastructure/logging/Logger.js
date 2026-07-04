// src/infrastructure/logging/Logger.js

const pino = require("pino");

class Logger {
  static instance = null;

  constructor() {
    if (Logger.instance) {
      return Logger.instance;
    }

    this.logger = pino({
      level: process.env.LOG_LEVEL || "info",

      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",

              options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    });

    Logger.instance = this;
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }

    return Logger.instance;
  }

  info(message, meta = {}) {
    this.logger.info(meta, message);
  }

  warn(message, meta = {}) {
    this.logger.warn(meta, message);
  }

  error(message, meta = {}) {
    this.logger.error(meta, message);
  }

  debug(message, meta = {}) {
    this.logger.debug(meta, message);
  }

  fatal(message, meta = {}) {
    this.logger.fatal(meta, message);
  }
}

module.exports = Logger;
