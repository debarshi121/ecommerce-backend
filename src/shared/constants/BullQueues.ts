// src/shared/constants/BullQueues.ts

export const BullQueues = {
  OUTBOX_QUEUE: "outbox-queue",
} as const;

export type BullQueue = (typeof BullQueues)[keyof typeof BullQueues];

export const { OUTBOX_QUEUE } = BullQueues;
