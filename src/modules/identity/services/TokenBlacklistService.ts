// src/modules/identity/services/TokenBlacklistService.ts

import type { ICacheService } from "../../../shared/contracts";
import type { ITokenBlacklistService } from "../contracts";

export interface TokenBlacklistServiceDependencies {
  cacheService: ICacheService;
}

/**
 * Revokes still-valid access tokens on logout. Entries expire exactly when
 * the token itself would have, so the blacklist can never outgrow the token
 * TTL.
 */
export class TokenBlacklistService implements ITokenBlacklistService {
  private readonly cacheService: ICacheService;

  constructor({ cacheService }: TokenBlacklistServiceDependencies) {
    this.cacheService = cacheService;
  }

  /*
  ------------------------------------------
  Add token to blacklist
  ttl = remaining lifetime in seconds
  ------------------------------------------
  */
  async blacklist(token: string, ttlSeconds: number): Promise<void> {
    await this.cacheService.set(`blacklist:${token}`, true, ttlSeconds);
  }

  /*
  ------------------------------------------
  Check if token is blacklisted
  ------------------------------------------
  */
  async isBlacklisted(token: string): Promise<boolean> {
    const exists = await this.cacheService.get<boolean>(`blacklist:${token}`);

    return Boolean(exists);
  }
}
