// src/app/registerErrorHandlers.js

const AppError = require("../shared/errors/AppError");

function registerErrorHandlers(app) {
  app.use((error, req, res, next) => {
    if (error instanceof AppError) {
      const response = {
        success: false,
        message: error.message,
      };

      if (error.errors) {
        response.errors = error.errors;
      }

      return res.status(error.statusCode).json(response);
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  });
}

module.exports = registerErrorHandlers;
