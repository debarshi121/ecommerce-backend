// src/app/registerMiddleware.ts

import cors from "cors";
import express, { type Express } from "express";

import { corsConfig } from "../config/cors";
import { httpLogger } from "../infrastructure/logging/HttpLoggerMiddleware";
import { requestContextMiddleware } from "../infrastructure/logging/RequestContextMiddleware";

/**
 * Order matters: the request context is opened first so every later
 * middleware (the access log included) can attach the correlation id.
 */
export function registerMiddleware(app: Express): void {
  app.use(requestContextMiddleware);
  app.use(cors(corsConfig));
  app.use(httpLogger);
  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true,
    }),
  );
}
