// src/infrastructure/logging/RequestContextMiddleware.ts

import { randomUUID } from "crypto";
import type { RequestHandler } from "express";

import { requestContext } from "./RequestContext";

/**
 * Opens an AsyncLocalStorage scope per request so every log line emitted
 * while handling it carries the same `requestId`, however deep the call.
 */
export const requestContextMiddleware: RequestHandler = (req, _res, next) => {
  const requestId = randomUUID();

  requestContext.run(
    {
      requestId,
    },

    () => {
      req.requestId = requestId;

      next();
    },
  );
};
