// src/infrastructure/logging/Logger.js

const pino = require("pino");
const requestContext = require("./RequestContext");

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

  getMetadata(meta = {}) {
    const requestId = requestContext.get("requestId");

    const data = {
      ...meta,
    };

    if (requestId) {
      data.requestId = requestId;
    }

    return data;
  }

  info(message, meta = {}) {
    this.logger.info(this.getMetadata(meta), message);
  }

  warn(message, meta = {}) {
    this.logger.warn(this.getMetadata(meta), message);
  }

  error(message, error = null, meta = {}) {
    this.logger.error(
      this.getMetadata({
        error,
        ...meta,
      }),
      message,
    );
  }

  debug(message, meta = {}) {
    this.logger.debug(this.getMetadata(meta), message);
  }

  fatal(message, meta = {}) {
    this.logger.fatal(this.getMetadata(meta), message);
  }

  flush() {
    return new Promise((resolve) => this.logger.flush(resolve));
  }
}

module.exports = Logger.getInstance();
