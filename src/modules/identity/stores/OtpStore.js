class OtpStore {
  constructor(cacheService) {
    this.cacheService = cacheService;
  }

  getKey(email) {
    return `identity:otp:${email}`;
  }

  async save(email, otp, ttl = 300) {
    await this.cacheService.set(this.getKey(email), otp, ttl);
  }

  async get(email) {
    return this.cacheService.get(this.getKey(email));
  }

  async delete(email) {
    await this.cacheService.delete(this.getKey(email));
  }
}

module.exports = OtpStore;
