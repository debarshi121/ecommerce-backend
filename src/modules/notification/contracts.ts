// src/modules/notification/contracts.ts

/** One outbound message, provider-agnostic. */
export interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Transport port. `ConsoleEmailProvider` logs; a real SMTP/SES provider
 * would implement the same interface, and nothing above this line changes.
 */
export interface IEmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export interface IEmailService {
  send(message: EmailMessage): Promise<void>;
}

export interface WelcomeEmailRecipient {
  name: string;
  email: string;
}

export interface INotificationService {
  sendWelcomeEmail(recipient: WelcomeEmailRecipient): Promise<void>;
  sendOtpNotification(email: string, otp: string): Promise<void>;
}
