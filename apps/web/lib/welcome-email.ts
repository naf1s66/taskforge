import 'server-only';

import type { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface WelcomeEmailUser {
  id: string;
  email: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export interface EmailAdapter {
  sendMail(message: EmailMessage): Promise<void>;
}

export interface WelcomeEmailServiceOptions {
  prisma: PrismaClient;
  emailAdapter?: EmailAdapter;
  appName?: string;
  logger?: Pick<Console, 'error' | 'info'>;
}

type MailTransporter = Pick<nodemailer.Transporter, 'sendMail'>;

type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
};

const WELCOME_TYPE = 'WELCOME';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderWelcomeTemplate(input: { appName: string; recipientEmail: string }) {
  const subject = `Welcome to ${input.appName}`;
  const text = `Welcome to ${input.appName}, ${input.recipientEmail}. Your account is ready.`;
  const html = `<p>Welcome to <strong>${escapeHtml(input.appName)}</strong>, ${escapeHtml(input.recipientEmail)}.</p><p>Your account is ready.</p>`;

  return { subject, text, html };
}

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) return fallback;
  if (!/^\d+$/.test(rawPort)) {
    throw new Error(`SMTP_PORT must be an integer. Received: ${rawPort}`);
  }

  return Number.parseInt(rawPort, 10);
}

function getSmtpConfig(): SmtpConfig {
  const isLocal = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  return {
    host: process.env.SMTP_HOST?.trim() || (isLocal ? 'mailhog' : 'smtp.resend.com'),
    port: parsePort(process.env.SMTP_PORT, isLocal ? 1025 : 587),
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS?.trim() || undefined,
    from: process.env.EMAIL_FROM?.trim() || 'TaskForge <noreply@taskforge.local>',
  };
}

class NodemailerEmailAdapter implements EmailAdapter {
  private readonly transporter: MailTransporter;

  constructor(private readonly smtpConfig: SmtpConfig) {
    const options: SMTPTransport.Options = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: smtpConfig.user && smtpConfig.pass ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
    };

    this.transporter = nodemailer.createTransport(options);
  }

  async sendMail(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: message.from ?? this.smtpConfig.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function createDefaultEmailAdapter(): EmailAdapter {
  return new NodemailerEmailAdapter(getSmtpConfig());
}

export class WelcomeEmailService {
  private readonly appName: string;
  private readonly logger: Pick<Console, 'error' | 'info'>;

  constructor(private readonly options: WelcomeEmailServiceOptions) {
    this.appName = options.appName ?? 'TaskForge';
    this.logger = options.logger ?? console;
  }

  async sendWelcomeEmail(user: WelcomeEmailUser): Promise<void> {
    const recipient = user.email.toLowerCase();
    const idempotencyKey = `welcome:${user.id}`;

    const delivery = await this.options.prisma.notificationDelivery.upsert({
      where: { idempotencyKey },
      create: {
        userId: user.id,
        idempotencyKey,
        type: WELCOME_TYPE,
        recipient,
      },
      update: { recipient },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    });

    const latestAttempt = delivery.attempts[0];
    if (latestAttempt?.status === 'SENT' || latestAttempt?.status === 'PENDING') {
      this.logger.info('[notifications] Welcome email already queued or sent; skipping duplicate', {
        userId: user.id,
        deliveryId: delivery.id,
      });
      return;
    }

    const attempt = await this.options.prisma.notificationDeliveryAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
        type: WELCOME_TYPE,
        recipient,
        status: 'PENDING',
        provider: 'smtp',
      },
    });

    try {
      const emailAdapter = this.options.emailAdapter ?? createDefaultEmailAdapter();
      const message = renderWelcomeTemplate({ appName: this.appName, recipientEmail: recipient });

      await emailAdapter.sendMail({
        to: recipient,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      await this.options.prisma.notificationDeliveryAttempt.update({
        where: { id: attempt.id },
        data: { status: 'SENT', deliveredAt: new Date() },
      });

      this.logger.info('[notifications] Welcome email sent', {
        userId: user.id,
        deliveryId: delivery.id,
      });
    } catch (error) {
      const errorMessage = resolveErrorMessage(error);

      await this.options.prisma.notificationDeliveryAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          errorCode: error instanceof Error ? error.name : 'Error',
          errorMessage,
        },
      });

      this.logger.error('[notifications] Welcome email failed', {
        userId: user.id,
        deliveryId: delivery.id,
        error: errorMessage,
      });
    }
  }
}
