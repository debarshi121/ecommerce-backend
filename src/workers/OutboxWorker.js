// src/workers/OutboxWorker.js

const QueueWorker = require("../infrastructure/bullmq/QueueWorker");

const { OUTBOX_QUEUE } = require("../shared/constants/QueueNames");

class OutboxWorker {
  constructor({ publishOutboxJob }) {
    this.worker = new QueueWorker(OUTBOX_QUEUE, async () => {
      await publishOutboxJob.handle();
    });
  }

  async close() {
    await this.worker.close();
  }
}

module.exports = OutboxWorker;
