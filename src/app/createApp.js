// src/app/createApp.js

const express = require("express");

const registerMiddleware = require("./registerMiddleware");

const registerRoutes = require("./registerRoutes");

const registerErrorHandlers = require("./registerErrorHandlers");

function createApp(dependencies) {
  const app = express();

  registerMiddleware(app);

  registerRoutes(app, dependencies);

  registerErrorHandlers(app);

  return app;
}

module.exports = createApp;
