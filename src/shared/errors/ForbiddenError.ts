// src/shared/errors/ForbiddenError.ts

import { AppError } from "./AppError";

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}
