// src/shared/constants/InboxStatus.ts
//
// Mirrors chk_inbox_events_status in migration 004.

export const InboxStatus = {
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
} as const;

export type InboxStatusValue = (typeof InboxStatus)[keyof typeof InboxStatus];
