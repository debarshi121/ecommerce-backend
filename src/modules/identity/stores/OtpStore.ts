// src/modules/identity/stores/OtpStore.ts

import type { ICacheService } from "../../../shared/contracts";
import type { IOtpStore } from "../contracts";

const DEFAULT_OTP_TTL_SECONDS = 300;

/**
 * Owns the OTP key space in the cache, so no other component needs to know
 * how a one-time password is keyed or how long it lives.
 */
export class OtpStore implements IOtpStore {
  private readonly cacheService: ICacheService;

  constructor(cacheService: ICacheService) {
    this.cacheService = cacheService;
  }

  private getKey(email: string): string {
    return `identity:otp:${email}`;
  }

  async save(
    email: string,
    otp: string,
    ttlSeconds: number = DEFAULT_OTP_TTL_SECONDS,
  ): Promise<void> {
    await this.cacheService.set(this.getKey(email), otp, ttlSeconds);
  }

  async get(email: string): Promise<string | null> {
    return this.cacheService.get<string>(this.getKey(email));
  }

  async delete(email: string): Promise<void> {
    await this.cacheService.delete(this.getKey(email));
  }
}
