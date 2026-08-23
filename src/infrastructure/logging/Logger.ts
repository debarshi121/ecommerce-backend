// src/infrastructure/logging/Logger.ts

import pino, { type Logger as PinoLogger } from "pino";

import { requestContext } from "./RequestContext";

/** Structured fields attached to a log line. */
export type LogMetadata = Record<string, unknown>;

/**
 * Application logger: a thin, swappable facade over pino that auto-attaches
 * the current request id, so no call site has to pass correlation data
 * around by hand.
 */
export class Logger {
  private static instance: Logger | null = null;

  private readonly logger: PinoLogger;

  private constructor() {
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
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }

    return Logger.instance;
  }

  private getMetadata(meta: LogMetadata = {}): LogMetadata {
    const requestId = requestContext.get("requestId");

    const data: LogMetadata = {
      ...meta,
    };

    if (requestId) {
      data.requestId = requestId;
    }

    return data;
  }

  info(message: string, meta: LogMetadata = {}): void {
    this.logger.info(this.getMetadata(meta), message);
  }

  warn(message: string, meta: LogMetadata = {}): void {
    this.logger.warn(this.getMetadata(meta), message);
  }

  /**
   * Same `(message, meta)` signature as every other level — callers put the
   * failure under an explicit `error` key in `meta` rather than relying on a
   * positional argument, so structured fields never end up nested inside
   * one another.
   */
  error(message: string, meta: LogMetadata = {}): void {
    this.logger.error(this.getMetadata(meta), message);
  }

  debug(message: string, meta: LogMetadata = {}): void {
    this.logger.debug(this.getMetadata(meta), message);
  }

  fatal(message: string, meta: LogMetadata = {}): void {
    this.logger.fatal(this.getMetadata(meta), message);
  }

  flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.flush(() => resolve());
    });
  }
}

export const logger = Logger.getInstance();
