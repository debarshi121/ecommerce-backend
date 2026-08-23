// src/modules/identity/middleware/JwtMiddleware.ts

import type { NextFunction, Request, Response } from "express";

import { NotFoundError } from "../../../shared/errors/NotFoundError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type {
  ITokenBlacklistService,
  ITokenService,
  IUserRepository,
} from "../contracts";

export interface JwtMiddlewareDependencies {
  tokenService: ITokenService;
  userRepository: IUserRepository;
  tokenBlacklistService: ITokenBlacklistService;
}

/**
 * Authenticates a request from its bearer token and populates `req.user`.
 *
 * Four independent things are checked: the token is well-formed and signed,
 * it has not been explicitly revoked (logout), the user still exists and is
 * active, and the token version still matches — the last one is what makes
 * "log out of all devices" effective immediately.
 */
export class JwtMiddleware {
  private readonly tokenService: ITokenService;

  private readonly userRepository: IUserRepository;

  private readonly tokenBlacklistService: ITokenBlacklistService;

  constructor({
    tokenService,
    userRepository,
    tokenBlacklistService,
  }: JwtMiddlewareDependencies) {
    this.tokenService = tokenService;
    this.userRepository = userRepository;
    this.tokenBlacklistService = tokenBlacklistService;
  }

  async authenticate(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Unauthorized");
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        throw new UnauthorizedError("Unauthorized");
      }

      const blacklisted = await this.tokenBlacklistService.isBlacklisted(token);

      if (blacklisted) {
        throw new UnauthorizedError("Unauthorized");
      }

      const decoded = this.tokenService.verifyAccessToken(token);

      const user = await this.userRepository.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new NotFoundError("User not found");
      }

      if (user.tokenVersion !== decoded.tokenVersion) {
        throw new UnauthorizedError("Unauthorized");
      }

      req.user = {
        id: user.id,
        role: user.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}
