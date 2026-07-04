// src/infrastructure/logging/HttpLoggerMiddleware.js

const logger = require("./Logger");

function httpLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (res.statusCode >= 500) {
      logger.error("HTTP Request", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    } else if (res.statusCode >= 400) {
      logger.warn("HTTP Request", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    } else {
      logger.info("HTTP Request", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    }
  });

  next();
}

module.exports = httpLogger;
