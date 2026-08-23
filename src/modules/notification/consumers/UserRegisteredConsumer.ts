// src/modules/notification/consumers/UserRegisteredConsumer.ts

import type { UserRegisteredPayload } from "../../identity/contracts";
import type { INotificationService } from "../contracts";

export interface UserRegisteredConsumerDependencies {
  notificationService: INotificationService;
}

export class UserRegisteredConsumer {
  private readonly notificationService: INotificationService;

  constructor({ notificationService }: UserRegisteredConsumerDependencies) {
    this.notificationService = notificationService;
  }

  async handle(payload: UserRegisteredPayload): Promise<void> {
    await this.notificationService.sendWelcomeEmail({
      name: payload.name,
      email: payload.email,
    });
  }
}
