// src/modules/notification/services/SmsService.ts

import { logger } from "../../../infrastructure/logging/Logger";

/** Placeholder transport until a real SMS gateway is wired in. */
export class SmsService {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    logger.info("Sending OTP over SMS", {
      phone,
      otp,
    });

    return true;
  }
}
