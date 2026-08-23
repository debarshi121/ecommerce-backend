// src/modules/notification/providers/ConsoleEmailProvider.ts

import { logger } from "../../../infrastructure/logging/Logger";
import type { EmailMessage } from "../contracts";
import { EmailProvider } from "./EmailProvider";

/** Development transport: writes the message to the structured log. */
export class ConsoleEmailProvider extends EmailProvider {
  override async send({ to, subject, html, text }: EmailMessage): Promise<void> {
    logger.info("Sending email", {
      to,
      subject,
      html,
      text,
    });
  }
}
