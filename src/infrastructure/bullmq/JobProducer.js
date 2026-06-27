// src/infrastructure/bullmq/JobProducer.js

const QueueManager = require("./QueueManager");

class JobProducer {
  constructor(queueName) {
    this.queue = QueueManager.getQueue(queueName);
  }

  async enqueue(jobName, payload, options = {}) {
    const job = await this.queue.add(
      jobName,

      payload,

      options,
    );

    return job.id;
  }
}

module.exports = JobProducer;
