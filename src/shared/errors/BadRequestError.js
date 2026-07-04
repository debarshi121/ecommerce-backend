const AppError = require("./AppError");

class BadRequestError extends AppError {
  constructor(message = "Bad Request", errors = []) {
    super(message, 400);

    this.errors = errors;
  }
}

module.exports = BadRequestError;
