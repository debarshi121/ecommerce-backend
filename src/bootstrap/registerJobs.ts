// src/bootstrap/registerJobs.ts

import { JobProducer } from "../infrastructure/bullmq/JobProducer";
import { logger } from "../infrastructure/logging/Logger";

import { OUTBOX_QUEUE } from "../shared/constants/BullQueues";

const OUTBOX_POLL_INTERVAL_MS = 5000;

/**
 * Registers the repeatable jobs. BullMQ keys a repeatable job by name +
 * pattern, so re-running this on every boot re-declares rather than
 * duplicates it.
 */
export async function registerJobs(): Promise<void> {
  const producer = new JobProducer(OUTBOX_QUEUE);

  await producer.addJob(
    "publish-outbox",

    {},

    {
      repeat: {
        every: OUTBOX_POLL_INTERVAL_MS,
      },
    },
  );

  logger.info("Scheduled outbox job");
}
