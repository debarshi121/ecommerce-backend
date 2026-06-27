class OtpStore {
  constructor(cacheService) {
    this.cacheService = cacheService;
  }

  getKey(email) {
    return `identity:otp:${email}`;
  }

  async saveOtp(email, otp, ttl) {
    await this.cacheService.set(this.getKey(email), otp, ttl);
  }

  async getOtp(email) {
    return this.cacheService.get(this.getKey(email));
  }

  async deleteOtp(email) {
    await this.cacheService.delete(this.getKey(email));
  }
}

module.exports = OtpStore;
