// src/infrastructure/logging/RequestContextMiddleware.js

const { randomUUID } = require("crypto");

const requestContext = require("./RequestContext");

function requestContextMiddleware(req, res, next) {
  const requestId = randomUUID();

  requestContext.run(
    {
      requestId,
    },

    () => {
      req.requestId = requestId;

      next();
    },
  );
}

module.exports = requestContextMiddleware;
