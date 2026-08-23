// src/app/registerErrorHandlers.ts

import type { ErrorRequestHandler, Express } from "express";

import { logger } from "../infrastructure/logging/Logger";
import { AppError } from "../shared/errors/AppError";
import type { ErrorResponse } from "../shared/types/http";

/**
 * The single exit point for failures.
 *
 * An `AppError` is something this application decided to raise, so its
 * message and status are safe to return. Anything else is an unexpected
 * fault: it is logged in full (with the request id, via the logger) and
 * reported as a bare 500, so internals never leak to the client.
 */
export function registerErrorHandlers(app: Express): void {
  const handler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
      const response: ErrorResponse = {
        success: false,
        message: error.message,
      };

      if (error.errors) {
        response.errors = error.errors;
      }

      res.status(error.statusCode).json(response);

      return;
    }

    logger.error("Unhandled error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const response: ErrorResponse = {
      success: false,
      message: "Internal server error",
    };

    res.status(500).json(response);
  };

  app.use(handler);
}
