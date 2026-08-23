// src/infrastructure/bullmq/JobProducer.ts

import type { JobsOptions, Queue } from "bullmq";

import { QueueManager } from "./QueueManager";

/** Enqueues work onto one named BullMQ queue. */
export class JobProducer<TPayload = unknown> {
  private readonly queue: Queue;

  constructor(queueName: string) {
    this.queue = QueueManager.getQueue(queueName);
  }

  async enqueue(
    jobName: string,
    payload: TPayload,
    options: JobsOptions = {},
  ): Promise<string | undefined> {
    const job = await this.queue.add(
      jobName,

      payload,

      options,
    );

    return job.id;
  }

  /** Alias of {@link enqueue}. */
  async addJob(
    jobName: string,
    payload: TPayload,
    options: JobsOptions = {},
  ): Promise<string | undefined> {
    return this.enqueue(jobName, payload, options);
  }
}
