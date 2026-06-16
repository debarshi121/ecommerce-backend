// src/app/registerMiddleware.js

function registerMiddleware(app) {
    app.use(require("express").json());
}

module.exports = registerMiddleware;