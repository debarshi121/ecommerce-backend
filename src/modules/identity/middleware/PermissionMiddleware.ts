// src/modules/identity/middleware/PermissionMiddleware.ts

import type { RequestHandler } from "express";

import { ForbiddenError } from "../../../shared/errors/ForbiddenError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type { IUserRepository } from "../contracts";

export interface PermissionMiddlewareDependencies {
  userRepository: IUserRepository;
}

/**
 * Produces a guard for one named permission. Always mounted *after*
 * JwtMiddleware.authenticate, which is what puts `req.user` in place.
 */
export class PermissionMiddleware {
  private readonly userRepository: IUserRepository;

  constructor({ userRepository }: PermissionMiddlewareDependencies) {
    this.userRepository = userRepository;
  }

  require(permission: string): RequestHandler {
    return async (req, _res, next) => {
      try {
        if (!req.user) {
          throw new UnauthorizedError("Unauthorized");
        }

        const permissions = await this.userRepository.findPermissionsById(
          req.user.id,
        );

        const hasPermission = permissions.some(
          (item) => item.name === permission,
        );

        if (!hasPermission) {
          throw new ForbiddenError(`Missing permission: ${permission}`);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}
