import { Prisma, type PrismaClient } from '@prisma/client';

import { getSmtpConfig } from '../config/smtp';
import { NodemailerEmailAdapter } from '../email/nodemailer-adapter';
import { renderWelcomeTemplate } from '../email/templates';
import type { EmailAdapter } from '../email/types';

export interface WelcomeEmailUser {
  id: string;
  email: string;
}

export interface WelcomeEmailServiceOptions {
  prisma: PrismaClient;
  emailAdapter?: EmailAdapter;
  appName?: string;
  logger?: Pick<Console, 'error' | 'info'>;
}

export interface WelcomeEmailResult {
  deliveryId: string;
  status: 'sent' | 'failed' | 'skipped';
}

const WELCOME_TYPE = 'WELCOME';

function getWelcomeIdempotencyKey(userId: string): string {
  return `welcome:${userId}`;
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

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export class WelcomeEmailService {
  private readonly appName: string;
  private readonly logger: Pick<Console, 'error' | 'info'>;

  constructor(private readonly options: WelcomeEmailServiceOptions) {
    this.appName = options.appName ?? 'TaskForge';
    this.logger = options.logger ?? console;
  }

  async sendWelcomeEmail(user: WelcomeEmailUser): Promise<WelcomeEmailResult> {
    const recipient = user.email.toLowerCase();
    const idempotencyKey = getWelcomeIdempotencyKey(user.id);

    const delivery = await this.options.prisma.notificationDelivery.upsert({
      where: { idempotencyKey },
      create: {
        userId: user.id,
        idempotencyKey,
        type: WELCOME_TYPE,
        recipient,
      },
      update: {
        recipient,
      },
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
      return { deliveryId: delivery.id, status: 'skipped' };
    }

    const preference = await this.options.prisma.emailPreference.findUnique({
      where: { userId: user.id },
      select: { welcomeEmailEnabled: true },
    });

    if (preference?.welcomeEmailEnabled === false) {
      this.logger.info('[notifications] Welcome email disabled by user preference; skipping', {
        userId: user.id,
        deliveryId: delivery.id,
      });
      return { deliveryId: delivery.id, status: 'skipped' };
    }

    const attemptNumber = (latestAttempt?.attemptNumber ?? 0) + 1;
    const attempt = await this.options.prisma.notificationDeliveryAttempt
      .create({
        data: {
          deliveryId: delivery.id,
          attemptNumber,
          type: WELCOME_TYPE,
          recipient,
          status: 'PENDING',
          provider: 'smtp',
        },
      })
      .catch(error => {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        this.logger.info('[notifications] Welcome email attempt already exists; skipping duplicate', {
          userId: user.id,
          deliveryId: delivery.id,
        });

        return null;
      });

    if (!attempt) {
      return { deliveryId: delivery.id, status: 'skipped' };
    }

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
        data: {
          status: 'SENT',
          deliveredAt: new Date(),
        },
      });

      this.logger.info('[notifications] Welcome email sent', {
        userId: user.id,
        deliveryId: delivery.id,
      });

      return { deliveryId: delivery.id, status: 'sent' };
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

      return { deliveryId: delivery.id, status: 'failed' };
    }
  }
}
