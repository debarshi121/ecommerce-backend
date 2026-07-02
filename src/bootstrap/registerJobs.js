// src/bootstrap/registerJobs.js

const JobProducer = require("../infrastructure/bullmq/JobProducer");

const { OUTBOX_QUEUE } = require("../shared/constants/QueueNames");

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

  console.log("Scheduled outbox job");
}

module.exports = registerJobs;
