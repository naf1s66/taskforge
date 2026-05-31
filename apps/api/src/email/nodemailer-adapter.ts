import nodemailer, { type SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import type { EmailAdapter, EmailSendResult, SendMailInput } from './types';
import type { SmtpConfig } from '../config/smtp';

type MailTransporter = {
  sendMail(mailOptions: SendMailOptions): Promise<unknown>;
};
type TransportFactory = (options: SMTPTransport.Options) => MailTransporter;

export class NodemailerEmailAdapter implements EmailAdapter {
  private readonly transporter: MailTransporter;

  constructor(
    private readonly smtpConfig: SmtpConfig,
    createTransport: TransportFactory = nodemailer.createTransport,
  ) {
    this.transporter = createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: smtpConfig.user && smtpConfig.pass ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
    });
  }

  async sendMail(message: SendMailInput): Promise<EmailSendResult> {
    const result = await this.transporter.sendMail({
      from: message.from ?? this.smtpConfig.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return sanitizeSendResult(result);
  }
}

function sanitizeSendResult(value: unknown): EmailSendResult {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const record = value as Record<string, unknown>;
  const providerMetadata: Record<string, unknown> = {};
  if (Array.isArray(record.accepted)) {
    providerMetadata.acceptedCount = record.accepted.length;
  }
  if (Array.isArray(record.rejected)) {
    providerMetadata.rejectedCount = record.rejected.length;
  }
  if (typeof record.response === 'string') {
    providerMetadata.response = record.response.slice(0, 512);
  }

  return {
    providerMessageId: typeof record.messageId === 'string' ? record.messageId : null,
    providerMetadata: Object.keys(providerMetadata).length > 0 ? providerMetadata : null,
  };
}
