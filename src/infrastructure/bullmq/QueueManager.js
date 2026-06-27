// src/infrastructure/bullmq/QueueManager.js

const { Queue } = require("bullmq");

const redisConfig = require("../../config/redis");

class QueueManager {
  static queues = new Map();

  static getQueue(queueName) {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(
        queueName,

        {
          connection: redisConfig,

          defaultJobOptions: {
            attempts: 3,

            backoff: {
              type: "exponential",

              delay: 5000,
            },

            removeOnComplete: true,

            removeOnFail: false,
          },
        },
      );

      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName);
  }

  static async closeAll() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}

module.exports = QueueManager;
