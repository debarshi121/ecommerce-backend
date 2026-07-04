// src/shared/errors/ForbiddenError.js

const AppError = require("./AppError");

class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

module.exports = ForbiddenError;
