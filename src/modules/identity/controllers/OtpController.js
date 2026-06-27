// src/modules/identity/controllers/OtpController.js

class OtpController {
  constructor(otpService) {
    this.otpService = otpService;
  }

  async requestOtp(req, res, next) {
    try {
      const { email } = req.body;

      await this.otpService.requestOtp(email);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OtpController;
