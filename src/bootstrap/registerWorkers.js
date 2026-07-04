// src/bootstrap/registerWorkers.js

const logger = require("../infrastructure/logging/Logger");

function registerWorkers(dependencies) {
  const workers = [];

  workers.push(dependencies.outboxWorker);

  logger.info("Workers started");

  return workers;
}

module.exports = registerWorkers;
