// src/modules/identity/services/OtpService.js

const crypto = require("crypto");

class OtpService {
  constructor({ otpStore, eventPublisher }) {
    this.otpStore = otpStore;
    this.eventPublisher = eventPublisher;
  }

  async requestOtp(email) {
    const otp = crypto.randomInt(100000, 999999).toString();

    await this.otpStore.save(email, otp);

    await this.eventPublisher.publish("domain-events", "auth.otp.required", {
      email,
      otp,
    });

    return true;
  }

  async verifyOtp(email, otp) {
    const storedOtp = await this.otpStore.get(email);

    if (!storedOtp) {
      throw new Error("OTP expired");
    }

    if (storedOtp !== otp) {
      throw new Error("Invalid OTP");
    }

    await this.otpStore.delete(email);

    return true;
  }
}

module.exports = OtpService;
