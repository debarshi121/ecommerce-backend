// src/modules/identity/services/TokenService.ts

import crypto from "crypto";
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";

import { jwtConfig } from "../../../config/jwt";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type {
  AccessTokenClaims,
  ITokenService,
  RefreshTokenClaims,
  TokenSubject,
} from "../contracts";

export class TokenService implements ITokenService {
  private readonly accessSecret: Secret;

  private readonly refreshSecret: Secret;

  constructor() {
    this.accessSecret = jwtConfig.accessSecret;
    this.refreshSecret = jwtConfig.refreshSecret;
  }

  /**
   * Verifies signature, issuer and token kind in one place, translating every
   * jsonwebtoken failure mode into a 401 so callers never have to know that
   * library's error taxonomy.
   */
  private verify<T extends JwtPayload>(
    token: string,
    secret: Secret,
    expectedType: string,
  ): T {
    try {
      const decoded = jwt.verify(token, secret, {
        issuer: jwtConfig.issuer,
      });

      if (typeof decoded === "string") {
        throw new UnauthorizedError("Invalid token");
      }

      if (decoded.type !== expectedType) {
        throw new UnauthorizedError("Invalid token type");
      }

      return decoded as T;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }

      if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.NotBeforeError
      ) {
        throw new UnauthorizedError("Invalid token");
      }

      throw error;
    }
  }

  generateAccessToken(user: TokenSubject): string {
    const payload = {
      userId: user.id,
      roleId: user.roleId,
      tokenVersion: user.tokenVersion,
      type: "access",
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: jwtConfig.accessTokenExpiresIn,
      issuer: jwtConfig.issuer,
    });
  }

  generateRefreshToken(user: Pick<TokenSubject, "id">): string {
    const payload = {
      userId: user.id,
      type: "refresh",
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: jwtConfig.refreshTokenExpiresIn,
      issuer: jwtConfig.issuer,
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return this.verify<AccessTokenClaims>(token, this.accessSecret, "access");
  }

  verifyRefreshToken(token: string): RefreshTokenClaims {
    return this.verify<RefreshTokenClaims>(
      token,
      this.refreshSecret,
      "refresh",
    );
  }

  /** Sessions store only this digest, never the refresh token itself. */
  hashRefreshToken(refreshToken: string): string {
    return crypto.createHash("sha256").update(refreshToken).digest("hex");
  }

  decode(token: string): JwtPayload | null {
    const decoded = jwt.decode(token);

    if (!decoded || typeof decoded === "string") {
      return null;
    }

    return decoded;
  }
}
