// src/app/createApp.ts

import express, { type Express } from "express";

import type { AppContainer } from "../bootstrap/container";

import { registerErrorHandlers } from "./registerErrorHandlers";
import { registerMiddleware } from "./registerMiddleware";
import { registerRoutes } from "./registerRoutes";

/**
 * Builds the HTTP app from an already-composed container. Taking the
 * container as an argument (rather than importing it) is what makes the app
 * constructible in a test with fakes in place of real infrastructure.
 */
export function createApp(dependencies: AppContainer): Express {
  const app = express();

  registerMiddleware(app);

  registerRoutes(app, dependencies);

  registerErrorHandlers(app);

  return app;
}
