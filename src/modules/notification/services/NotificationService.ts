// src/modules/notification/services/NotificationService.ts

import type {
  IEmailService,
  INotificationService,
  WelcomeEmailRecipient,
} from "../contracts";

export interface NotificationServiceDependencies {
  emailService: IEmailService;
}

/**
 * Owns the *content* of each notification; the channel (email today, SMS or
 * push tomorrow) is delegated. Consumers call this, never a provider.
 */
export class NotificationService implements INotificationService {
  private readonly emailService: IEmailService;

  constructor({ emailService }: NotificationServiceDependencies) {
    this.emailService = emailService;
  }

  async sendWelcomeEmail({
    name,
    email,
  }: WelcomeEmailRecipient): Promise<void> {
    await this.emailService.send({
      to: email,

      subject: "Welcome to Ecommerce!",

      text: `Hello ${name},

        Welcome to Ecommerce!

        We're excited to have you on board.

        Thanks,
        Ecommerce Team`,
    });
  }

  async sendOtpNotification(email: string, otp: string): Promise<void> {
    await this.emailService.send({
      to: email,

      subject: "Your one-time password",

      text: `Your one-time password is ${otp}. It expires in 5 minutes.`,
    });
  }
}
