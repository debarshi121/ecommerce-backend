// src/infrastructure/logging/HttpLoggerMiddleware.ts

import type { Request, RequestHandler, Response } from "express";

import { logger, type LogMetadata } from "./Logger";

function buildAccessLog(
  req: Request,
  res: Response,
  durationMs: number,
): LogMetadata {
  return {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${durationMs}ms`,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  };
}

export const httpLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const meta = buildAccessLog(req, res, Date.now() - start);

    if (res.statusCode >= 500) {
      logger.error("HTTP Request", meta);
    } else if (res.statusCode >= 400) {
      logger.warn("HTTP Request", meta);
    } else {
      logger.info("HTTP Request", meta);
    }
  });

  next();
};
