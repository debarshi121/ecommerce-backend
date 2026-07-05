class NotificationService {
  constructor({ emailService }) {
    this.emailService = emailService;
  }

  async sendWelcomeEmail({ name, email }) {
    await this.emailService.send({
      to: email,

      subject: "Welcome to Ecommerce!",

      text: `Hello ${name},

        Welcome to Ecommerce!

        We're excited to have you on board.

        Thanks,
        Ecommerce Team`,
    });
  }
}

module.exports = NotificationService;
