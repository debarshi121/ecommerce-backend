// src/app/registerRoutes.js

const identityRoutes = require("../modules/identity/routes");

const catalogRoutes = require("../modules/catalog/routes");

const inventoryRoutes = require("../modules/inventory/routes");

function registerRoutes(app, dependencies) {
  const routes = [
    ...identityRoutes(dependencies),
    ...catalogRoutes(dependencies),
    ...inventoryRoutes(dependencies),
  ];

  routes.forEach((route) => {
    app.use(`/api/v1${route.path}`, route.router);
  });
}

module.exports = registerRoutes;
