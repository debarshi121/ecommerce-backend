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

  async addJob(jobName, payload, options = {}) {
    return this.enqueue(jobName, payload, options);
  }
}

module.exports = JobProducer;
