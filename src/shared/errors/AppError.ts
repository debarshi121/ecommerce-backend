// src/shared/errors/AppError.ts

import type { ValidationIssue } from "../types/http";

/**
 * Base class for every error this application raises deliberately.
 *
 * `registerErrorHandlers` translates an `AppError` into its `statusCode` and
 * message; anything that is *not* an `AppError` is treated as an unexpected
 * fault and reported as a 500 with no internal detail leaked.
 */
export class AppError extends Error {
  readonly statusCode: number;

  /** Field-level detail, populated by validation failures. */
  readonly errors?: ValidationIssue[];

  constructor(message: string, statusCode = 500, errors?: ValidationIssue[]) {
    super(message);

    this.statusCode = statusCode;

    if (errors !== undefined) {
      this.errors = errors;
    }

    this.name = new.target.name;

    Error.captureStackTrace(this, new.target);
  }
}
