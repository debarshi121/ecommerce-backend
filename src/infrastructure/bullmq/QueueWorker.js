const { Worker } = require("bullmq");

const redisConfig = require("../../config/redis");

class QueueWorker {
  static workers = [];

  constructor(queueName, handler, options = {}) {
    const workerOptions = {
      concurrency: 5,
      ...options,
    };

    this.worker = new Worker(
      queueName,

      async (job) => {
        await handler({
          id: job.id,

          name: job.name,

          data: job.data,
        });
      },

      {
        connection: redisConfig,

        ...workerOptions,
      },
    );

    QueueWorker.workers.push(this.worker);
  }

  async close() {
    await this.worker.close();
  }

  static async closeAll() {
    for (const worker of this.workers) {
      await worker.close();
    }
  }
}

module.exports = QueueWorker;
