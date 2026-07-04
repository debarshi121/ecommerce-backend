// src/app/registerErrorHandlers.js

const AppError = require("../shared/errors/AppError");

function registerErrorHandlers(app) {
  app.use((error, req, res, next) => {
    console.error(error);

    /*
      Known application error
    */

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,

        message: error.message,
      });
    }

    /*
      Unknown error
    */

    return res.status(500).json({
      success: false,

      message: "Internal server error",
    });
  });
}

module.exports = registerErrorHandlers;
