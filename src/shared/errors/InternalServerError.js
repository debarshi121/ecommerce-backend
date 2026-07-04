// src/shared/errors/InternalServerError.js

const AppError = require("./AppError");

class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500);
  }
}

module.exports = InternalServerError;
