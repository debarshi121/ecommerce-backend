// src/bootstrap/registerWorkers.ts

import { logger } from "../infrastructure/logging/Logger";
import type { Closable } from "../workers/OutboxWorker";

import type { AppContainer } from "./container";

export type WorkerDependencies = Pick<AppContainer, "outboxWorker">;

/**
 * Starts the background workers and returns them so the shutdown sequence
 * can drain each one.
 */
export function registerWorkers(dependencies: WorkerDependencies): Closable[] {
  const workers: Closable[] = [];

  workers.push(dependencies.outboxWorker);

  logger.info("Workers started");

  return workers;
}
