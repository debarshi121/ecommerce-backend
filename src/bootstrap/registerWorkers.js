// src/bootstrap/registerWorkers.js

const QueueWorker = require("../infrastructure/bullmq/QueueWorker");
const Logger = require("../infrastructure/logging/Logger");

const { OUTBOX_QUEUE } = require("../shared/constants/QueueNames");

const logger = Logger.getInstance();

function registerWorkers(dependencies) {
  new QueueWorker(
    OUTBOX_QUEUE,

    async () => {
      await dependencies.outboxPublisherWorker.handle();
    },
  );

  logger.info("Workers started");
}

module.exports = registerWorkers;
