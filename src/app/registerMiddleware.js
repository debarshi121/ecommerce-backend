// src/app/registerMiddleware.js
const express = require("express");
const cors = require("cors");
const httpLogger = require("../infrastructure/logging/HttpLoggerMiddleware");
const requestContextMiddleware = require("../infrastructure/logging/RequestContextMiddleware");
const corsConfig = require("../config/cors");

function registerMiddleware(app) {
  app.use(requestContextMiddleware);
  app.use(cors(corsConfig));
  app.use(httpLogger);
  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true,
    }),
  );
}

module.exports = registerMiddleware;
