// src/modules/notification/services/EmailService.ts

import type { EmailMessage, IEmailProvider, IEmailService } from "../contracts";

export interface EmailServiceDependencies {
  emailProvider: IEmailProvider;
}

export class EmailService implements IEmailService {
  private readonly emailProvider: IEmailProvider;

  constructor({ emailProvider }: EmailServiceDependencies) {
    this.emailProvider = emailProvider;
  }

  async send({ to, subject, html, text }: EmailMessage): Promise<void> {
    await this.emailProvider.send({
      to,
      subject,
      ...(html !== undefined ? { html } : {}),
      ...(text !== undefined ? { text } : {}),
    });
  }
}
