// src/modules/identity/controllers/SessionController.ts

import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type { AuthService } from "../services/AuthService";

interface RefreshTokenBody {
  refreshToken: string;
}

interface LogoutBody {
  sessionId: string;
}

export class SessionController {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { refreshToken } = req.body as RefreshTokenBody;

      const result = await this.authService.refreshAccessToken(refreshToken);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async logout(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const authHeader = req.headers.authorization;

      const accessToken = authHeader?.split(" ")[1];

      if (!accessToken) {
        throw new UnauthorizedError("Unauthorized");
      }

      const { sessionId } = req.body as LogoutBody;

      await this.authService.logout(sessionId, accessToken);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAllDevices(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Unauthorized");
      }

      await this.authService.logoutAllDevices(req.user.id);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Unauthorized");
      }

      const user = await this.authService.getCurrentUser(req.user.id);

      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}
