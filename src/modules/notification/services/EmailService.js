class EmailService {
  constructor({ emailProvider }) {
    this.emailProvider = emailProvider;
  }

  async send({ to, subject, html, text }) {
    await this.emailProvider.send({
      to,
      subject,
      html,
      text,
    });
  }
}

module.exports = EmailService;
