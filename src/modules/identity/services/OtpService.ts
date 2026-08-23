// src/modules/identity/services/OtpService.ts

import crypto from "crypto";

import { EventNames } from "../../../shared/constants/EventNames";
import { RabbitModules } from "../../../shared/constants/RabbitModules";
import { RoutingKeys } from "../../../shared/constants/RoutingKeys";
import type { IEventPublisher } from "../../../shared/contracts";
import { ForbiddenError } from "../../../shared/errors/ForbiddenError";
import { UnauthorizedError } from "../../../shared/errors/UnauthorizedError";
import type { IOtpService, IOtpStore, OtpRequiredPayload } from "../contracts";

export interface OtpServiceDependencies {
  otpStore: IOtpStore;
  eventPublisher: IEventPublisher;
}

export class OtpService implements IOtpService {
  private readonly otpStore: IOtpStore;

  private readonly eventPublisher: IEventPublisher;

  constructor({ otpStore, eventPublisher }: OtpServiceDependencies) {
    this.otpStore = otpStore;
    this.eventPublisher = eventPublisher;
  }

  async requestOtp(email: string): Promise<boolean> {
    const otp = crypto.randomInt(100000, 999999).toString();

    await this.otpStore.save(email, otp);

    const payload: OtpRequiredPayload = { email, otp };

    // Published straight onto the bus instead of through the outbox: an OTP
    // is only useful for the next few minutes, so it must not wait for the
    // outbox poll, and there is no committed database state it has to stay
    // consistent with.
    await this.eventPublisher.publish({
      eventId: crypto.randomUUID(),
      module: RabbitModules.IDENTITY,
      eventName: EventNames.AUTH_OTP_REQUIRED,
      routingKey: RoutingKeys.AUTH_OTP_REQUIRED,
      payload,
    });

    return true;
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const storedOtp = await this.otpStore.get(email);

    if (!storedOtp) {
      throw new ForbiddenError("OTP expired");
    }

    if (storedOtp !== otp) {
      throw new UnauthorizedError("Invalid OTP");
    }

    await this.otpStore.delete(email);

    return true;
  }
}
