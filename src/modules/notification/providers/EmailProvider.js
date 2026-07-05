class EmailProvider {
  async send({ to, subject, html, text }) {
    throw new Error("send() must be implemented");
  }
}

module.exports = EmailProvider;
