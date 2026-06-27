class OtpRequiredConsumer {
  constructor({ notificationService }) {
    this.notificationService = notificationService;
  }

  async handle(payload) {
    await this.notificationService.sendOtpNotification(
      payload.email,
      payload.otp,
    );
  }
}

module.exports = OtpRequiredConsumer;
