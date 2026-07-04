// src/bootstrap/registerWorkers.js

const QueueWorker = require("../infrastructure/bullmq/QueueWorker");
const logger = require("../infrastructure/logging/Logger");

const { OUTBOX_QUEUE } = require("../shared/constants/QueueNames");

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
