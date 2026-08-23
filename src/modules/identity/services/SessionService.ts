// src/modules/identity/services/SessionService.ts

import { jwtConfig } from "../../../config/jwt";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type {
  ITransactionManager,
  MaybeTransaction,
} from "../../../shared/types/database";
import type { SessionRow } from "../../../shared/types/entities";
import type {
  CreateSessionCommand,
  ISessionRepository,
  ISessionService,
  ITokenService,
  TokenSubject,
} from "../contracts";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface SessionServiceDependencies {
  sessionRepository: ISessionRepository;
  tokenService: ITokenService;
  transactionManager: ITransactionManager;
}

/**
 * Owns the refresh-token side of authentication: one session row per device,
 * holding only a SHA-256 digest of the refresh token so a database leak
 * cannot be replayed.
 */
export class SessionService implements ISessionService {
  private readonly sessionRepository: ISessionRepository;

  private readonly tokenService: ITokenService;

  private readonly transactionManager: ITransactionManager;

  constructor({
    sessionRepository,
    tokenService,
    transactionManager,
  }: SessionServiceDependencies) {
    this.sessionRepository = sessionRepository;

    this.tokenService = tokenService;

    this.transactionManager = transactionManager;
  }

  private assertUsable(session: SessionRow | null): SessionRow {
    if (!session) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      throw new UnauthorizedError("Session expired");
    }

    return session;
  }

  async createSession(
    { userId, user, deviceName }: CreateSessionCommand,
    tx: MaybeTransaction = null,
  ): Promise<string> {
    const refreshToken = this.tokenService.generateRefreshToken(user);
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const expiresAt = new Date(
      Date.now() + jwtConfig.refreshTokenDays * DAY_IN_MS,
    );

    await this.sessionRepository.create(
      {
        userId,
        refreshTokenHash,
        deviceName: deviceName ?? null,
        expiresAt,
      },
      tx,
    );

    return refreshToken;
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    user: Pick<TokenSubject, "id">,
  ): Promise<string> {
    return this.transactionManager.execute(async (tx) => {
      const refreshTokenHash =
        this.tokenService.hashRefreshToken(oldRefreshToken);

      const session = this.assertUsable(
        await this.sessionRepository.findByRefreshTokenHash(
          refreshTokenHash,
          tx,
        ),
      );

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

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepository.deleteById(sessionId);
  }

  async deleteAllUserSessions(
    userId: string,
    tx: MaybeTransaction = null,
  ): Promise<void> {
    await this.sessionRepository.deleteByUserId(userId, tx);
  }

  async validateAndGetSession(refreshToken: string): Promise<SessionRow> {
    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);

    return this.assertUsable(
      await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash),
    );
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionRepository.deleteExpired();
  }
}
