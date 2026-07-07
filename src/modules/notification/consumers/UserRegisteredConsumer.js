class UserRegisteredConsumer {
  constructor({ notificationService }) {
    this.notificationService = notificationService;
  }

  async handle(payload) {
    // throw new Error("SMTP Down");
    await this.notificationService.sendWelcomeEmail({
      name: payload.name,
      email: payload.email,
    });
  }
}

module.exports = UserRegisteredConsumer;
