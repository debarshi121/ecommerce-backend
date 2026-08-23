// src/infrastructure/bullmq/QueueManager.ts

import { Queue } from "bullmq";

import { redisConfig } from "../../config/redis";

/**
 * Process-wide registry of BullMQ queues, so a queue name always maps to one
 * `Queue` instance (and therefore one Redis connection) no matter how many
 * producers ask for it.
 */
export class QueueManager {
  private static readonly queues = new Map<string, Queue>();

  static getQueue(queueName: string): Queue {
    const existing = QueueManager.queues.get(queueName);

    if (existing) {
      return existing;
    }

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

    QueueManager.queues.set(queueName, queue);

    return queue;
  }

  static async closeAll(): Promise<void> {
    for (const queue of QueueManager.queues.values()) {
      await queue.close();
    }
  }
}
