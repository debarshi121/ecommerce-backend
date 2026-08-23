// src/modules/identity/controllers/OtpController.ts

import type { NextFunction, Request, Response } from "express";

import type { IOtpService } from "../contracts";

interface RequestOtpBody {
  email: string;
}

export class OtpController {
  private readonly otpService: IOtpService;

  constructor(otpService: IOtpService) {
    this.otpService = otpService;
  }

  async requestOtp(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { email } = req.body as RequestOtpBody;

      await this.otpService.requestOtp(email);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
