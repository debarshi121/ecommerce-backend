// src/workers/OutboxWorker.js

const QueueWorker = require("../infrastructure/bullmq/QueueWorker");

const { OUTBOX_QUEUE } = require("../shared/constants/BullQueues");

class OutboxWorker {
  constructor({ publishOutboxJob }) {
    this.queueWorker = new QueueWorker(OUTBOX_QUEUE, async (job) => {
      await publishOutboxJob.handle(job);
    });
  }

  async close() {
    await this.queueWorker.close();
  }
}

module.exports = OutboxWorker;
