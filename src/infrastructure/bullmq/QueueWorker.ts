// src/infrastructure/bullmq/QueueWorker.ts

import { Worker, type WorkerOptions } from "bullmq";

import { redisConfig } from "../../config/redis";

/**
 * The subset of a BullMQ job handed to application-level job classes. It
 * deliberately excludes the live `Job` instance so jobs stay unit-testable
 * with a plain object and cannot reach back into the queue.
 */
export interface JobContext<TPayload = unknown> {
  id: string | undefined;
  name: string;
  data: TPayload;
}

export type JobHandler<TPayload = unknown> = (
  job: JobContext<TPayload>,
) => Promise<void>;

export class QueueWorker<TPayload = unknown> {
  private static readonly workers: Worker[] = [];

  private readonly worker: Worker;

  constructor(
    queueName: string,
    handler: JobHandler<TPayload>,
    options: Partial<WorkerOptions> = {},
  ) {
    this.worker = new Worker(
      queueName,

      async (job) => {
        await handler({
          id: job.id,

          name: job.name,

          data: job.data as TPayload,
        });
      },

      {
        connection: redisConfig,

        concurrency: 5,

        ...options,
      },
    );

    QueueWorker.workers.push(this.worker);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }

  static async closeAll(): Promise<void> {
    for (const worker of QueueWorker.workers) {
      await worker.close();
    }
  }
}
