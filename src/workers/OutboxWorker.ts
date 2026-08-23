// src/workers/OutboxWorker.ts

import { QueueWorker } from "../infrastructure/bullmq/QueueWorker";
import { OUTBOX_QUEUE } from "../shared/constants/BullQueues";
import type { PublishOutboxJob } from "../jobs/PublishOutboxJob";

export interface OutboxWorkerDependencies {
  publishOutboxJob: PublishOutboxJob;
}

/** Anything the graceful-shutdown sequence has to stop implements this. */
export interface Closable {
  close(): Promise<void>;
}

export class OutboxWorker implements Closable {
  private readonly queueWorker: QueueWorker;

  constructor({ publishOutboxJob }: OutboxWorkerDependencies) {
    this.queueWorker = new QueueWorker(OUTBOX_QUEUE, async () => {
      await publishOutboxJob.handle();
    });
  }

  async close(): Promise<void> {
    await this.queueWorker.close();
  }
}
