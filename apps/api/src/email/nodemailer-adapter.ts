import nodemailer from 'nodemailer';

import type { EmailAdapter, SendMailInput } from './types';
import type { SmtpConfig } from '../config/smtp';

export class NodemailerEmailAdapter implements EmailAdapter {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly smtpConfig: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: false,
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
