class UserRegisteredConsumer {
  constructor({ notificationService }) {
    this.notificationService = notificationService;
  }

  async handle(payload) {
    await this.notificationService.sendWelcomeEmail({
      name: payload.name,
      email: payload.email,
    });
  }
}

module.exports = UserRegisteredConsumer;
