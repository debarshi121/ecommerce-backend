const UnauthorizedError = require("../../../shared/errors/UnauthorizedError");
const jwtConfig = require("../../../config/jwt");
const DAY_IN_MS = 24 * 60 * 60 * 1000;

class SessionService {
  constructor({ sessionRepository, tokenService, transactionManager }) {
    this.sessionRepository = sessionRepository;

    this.tokenService = tokenService;

    this.transactionManager = transactionManager;
  }

  async createSession({ userId, user, deviceName }, tx = null) {
    const refreshToken = this.tokenService.generateRefreshToken(user);
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const expiresAt = new Date(
      Date.now() + jwtConfig.refreshTokenDays * DAY_IN_MS,
    );

    await this.sessionRepository.create(
      {
        userId,
        refreshTokenHash,
        deviceName,
        expiresAt,
      },
      tx,
    );

    return refreshToken;
  }

  async rotateRefreshToken(oldRefreshToken, user) {
    return this.transactionManager.execute(async (tx) => {
      const refreshTokenHash =
        this.tokenService.hashRefreshToken(oldRefreshToken);

      const session = await this.sessionRepository.findByRefreshTokenHash(
        refreshTokenHash,
        tx,
      );

      if (!session) {
        throw new UnauthorizedError("Invalid refresh token");
      }

      if (session.expiresAt && session.expiresAt < new Date()) {
        throw new UnauthorizedError("Session expired");
      }

      const newRefreshToken = this.tokenService.generateRefreshToken(user);
      const newRefreshTokenHash =
        this.tokenService.hashRefreshToken(newRefreshToken);

      await this.sessionRepository.updateRefreshTokenHash(
        session.id,
        newRefreshTokenHash,
        tx,
      );

      return newRefreshToken;
    });
  }

  async deleteSession(sessionId) {
    await this.sessionRepository.deleteById(sessionId);
  }

  async deleteAllUserSessions(userId, tx = null) {
    await this.sessionRepository.deleteByUserId(userId, tx);
  }

  async validateAndGetSession(refreshToken) {
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const session =
      await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      throw new UnauthorizedError("Session expired");
    }

    return session;
  }

  async cleanupExpiredSessions() {
    await this.sessionRepository.deleteExpired();
  }
}

module.exports = SessionService;
