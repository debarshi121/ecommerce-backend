class CleanupExpiredSessionsWorker {
  constructor(sessionService) {
    this.sessionService = sessionService;
  }

  async handle() {
    await this.sessionService.cleanupExpiredSessions();
  }
}

module.exports = CleanupExpiredSessionsWorker;
