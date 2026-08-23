// src/jobs/CleanupExpiredSessionsJob.ts

import type { ISessionService } from "../modules/identity/contracts";

export class CleanupExpiredSessionsJob {
  private readonly sessionService: ISessionService;

  constructor(sessionService: ISessionService) {
    this.sessionService = sessionService;
  }

  async handle(): Promise<void> {
    await this.sessionService.cleanupExpiredSessions();
  }
}
