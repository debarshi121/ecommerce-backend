class SmsService {
  async sendOtp(phone, otp) {
    console.log(`Sending OTP ${otp} to ${phone}`);

    return true;
  }
}

module.exports = SmsService;
