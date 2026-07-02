// src/modules/identity/services/TokenBlacklistService.js

class TokenBlacklistService {
  constructor({ cacheService }) {
    this.cacheService = cacheService;
  }

  /*
  ------------------------------------------
  Add token to blacklist
  ttl = remaining lifetime in seconds
  ------------------------------------------
  */
  async blacklist(token, ttl) {
    await this.cacheService.set(`blacklist:${token}`, true, ttl);
  }

  /*
  ------------------------------------------
  Check if token is blacklisted
  ------------------------------------------
  */
  async isBlacklisted(token) {
    const exists = await this.cacheService.get(`blacklist:${token}`);

    return !!exists;
  }
}

module.exports = TokenBlacklistService;
