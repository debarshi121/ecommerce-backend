// src/modules/notification/consumers/OtpRequiredConsumer.ts

import type { OtpRequiredPayload } from "../../identity/contracts";
import type { INotificationService } from "../contracts";

export interface OtpRequiredConsumerDependencies {
  notificationService: INotificationService;
}

export class OtpRequiredConsumer {
  private readonly notificationService: INotificationService;

  constructor({ notificationService }: OtpRequiredConsumerDependencies) {
    this.notificationService = notificationService;
  }

  async handle(payload: OtpRequiredPayload): Promise<void> {
    await this.notificationService.sendOtpNotification(
      payload.email,
      payload.otp,
    );
  }
}
