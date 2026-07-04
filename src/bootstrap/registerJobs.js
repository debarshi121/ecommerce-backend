// src/bootstrap/registerJobs.js

const JobProducer = require("../infrastructure/bullmq/JobProducer");
const Logger = require("../infrastructure/logging/Logger");

const { OUTBOX_QUEUE } = require("../shared/constants/QueueNames");

const logger = Logger.getInstance();

async function registerJobs() {
  const producer = new JobProducer(OUTBOX_QUEUE);

  await producer.addJob(
    "publish-outbox",

    {},

    {
      repeat: {
        every: 5000,
      },
    },
  );

  logger.info("Scheduled outbox job");
}

module.exports = registerJobs;
