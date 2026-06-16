// src/app/createApp.js

const express = require("express");

const registerMiddleware = require("./registerMiddleware");
const registerRoutes = require("./registerRoutes");
const registerErrorHandlers = require("./registerErrorHandlers");

function createApp() {
    const app = express();

    registerMiddleware(app);
    registerRoutes(app);
    registerErrorHandlers(app);

    return app;
}

module.exports = createApp;