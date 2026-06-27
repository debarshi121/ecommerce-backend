class EmailService {
  async sendOtp(email, otp) {
    console.log(`Sending OTP ${otp} to ${email}`);

    return true;
  }
}

module.exports = EmailService;
