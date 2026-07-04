// src/shared/errors/ConflictError.js

const AppError = require("./AppError");

class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

module.exports = ConflictError;
