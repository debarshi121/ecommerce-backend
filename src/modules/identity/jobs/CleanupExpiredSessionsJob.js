class CleanupExpiredSessionsJob {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  async handle() {
    await this.sessionRepository.deleteExpired();

    console.log("Expired sessions deleted");
  }
}

module.exports = CleanupExpiredSessionsJob;
