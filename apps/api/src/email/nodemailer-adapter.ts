import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import type { EmailAdapter, SendMailInput } from './types';
import type { SmtpConfig } from '../config/smtp';

type MailTransporter = Pick<nodemailer.Transporter, 'sendMail'>;
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

  async sendMail(message: SendMailInput): Promise<void> {
    await this.transporter.sendMail({
      from: message.from ?? this.smtpConfig.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
