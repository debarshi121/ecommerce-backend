const EmailProvider = require("./EmailProvider");
const logger = require("../../../infrastructure/logging/Logger");

class ConsoleEmailProvider extends EmailProvider {
  async send({ to, subject, html, text }) {
    logger.info("Sending email", {
      to,
      subject,
      html,
      text,
    });
  }
}

module.exports = ConsoleEmailProvider;
