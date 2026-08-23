// src/shared/errors/BadRequestError.ts

import { AppError } from "./AppError";
import type { ValidationIssue } from "../types/http";

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", errors: ValidationIssue[] = []) {
    super(message, 400, errors);
  }
}
