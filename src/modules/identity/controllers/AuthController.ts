// src/modules/identity/controllers/AuthController.ts

import type { NextFunction, Request, Response } from "express";

import { validated } from "../../../shared/validators/validate";
import type { AuthService } from "../services/AuthService";
import type { LoginInput } from "../validators/LoginValidator";
import type { RegisterInput } from "../validators/RegisterValidator";
import type { AuthenticationType } from "../contracts";

/** `type` is not part of LoginValidator, so it is read off the raw body. */
interface LoginTypeHint {
  type?: AuthenticationType;
  otp?: string;
}

export class AuthController {
  private readonly authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { body } = validated<RegisterInput>(req);

      const result = await this.authService.register({
        name: body.name,
        email: body.email,
        password: body.password,
        roleId: body.roleId,
        deviceName: body.deviceName,
      });

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { body } = validated<LoginInput>(req);

      const hint = req.body as LoginTypeHint;

      const result = await this.authService.login({
        email: body.email,
        password: body.password,
        otp: hint.otp,
        type: hint.type,
        deviceName: body.deviceName,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
