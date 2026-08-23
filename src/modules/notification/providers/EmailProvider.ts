// src/modules/notification/providers/EmailProvider.ts

import type { EmailMessage, IEmailProvider } from "../contracts";

export abstract class EmailProvider implements IEmailProvider {
  abstract send(message: EmailMessage): Promise<void>;
}
