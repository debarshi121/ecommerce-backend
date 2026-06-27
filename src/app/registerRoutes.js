// src/app/registerRoutes.js

const identityRoutes = require("../modules/identity/routes");

function registerRoutes(app, dependencies) {
  const routes = identityRoutes(dependencies);

  routes.forEach((route) => {
    app.use(`/api/v1${route.path}`, route.router);
  });
}

module.exports = registerRoutes;
