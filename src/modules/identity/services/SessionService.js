class SessionService {
  constructor({ sessionRepository, tokenService }) {
    this.sessionRepository = sessionRepository;

    this.tokenService = tokenService;
  }

  async createSession({ userId, user, deviceName }, tx = null) {
    const refreshToken = this.tokenService.generateRefreshToken(user);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.sessionRepository.create(
      {
        userId,
        refreshToken,
        deviceName,
        expiresAt,
      },
      tx,
    );

    return refreshToken;
  }

  async rotateRefreshToken(oldRefreshToken, user) {
    const session =
      await this.sessionRepository.findByRefreshToken(oldRefreshToken);

    if (!session) {
      throw new Error("Invalid session");
    }

    const newRefreshToken = this.tokenService.generateRefreshToken(user);

    await this.sessionRepository.updateRefreshToken(
      session.id,
      newRefreshToken,
    );

    return newRefreshToken;
  }

  async deleteSession(sessionId) {
    await this.sessionRepository.deleteById(sessionId);
  }

  async deleteAllUserSessions(userId) {
    await this.sessionRepository.deleteByUserId(userId);
  }

  async validateSession(refreshToken) {
    const session =
      await this.sessionRepository.findByRefreshToken(refreshToken);

    if (!session) {
      throw new Error("Session not found");
    }

    return session;
  }

  async cleanupExpiredSessions() {
    await this.sessionRepository.deleteExpired();
  }
}

module.exports = SessionService;
