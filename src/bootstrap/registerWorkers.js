// src/bootstrap/registerWorkers.js

const QueueWorker = require("../infrastructure/bullmq/QueueWorker");

const { OUTBOX_QUEUE } = require("../shared/constants/QueueNames");

function registerWorkers(dependencies) {
  new QueueWorker(
    OUTBOX_QUEUE,

    async () => {
      await dependencies.outboxPublisherWorker.handle();
    },
  );

  console.log("Workers started");
}

module.exports = registerWorkers;
