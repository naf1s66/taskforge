import { NotificationDeliveryStatus, NotificationDeliveryType, Prisma, type PrismaClient } from '@prisma/client';

import { getSmtpConfig } from '../config/smtp';
import { NodemailerEmailAdapter } from '../email/nodemailer-adapter';
import { renderWelcomeTemplate } from '../email/templates';
import type { EmailAdapter } from '../email/types';
import {
  classifyDeliveryFailure,
  logDeliveryFinished,
  sanitizeProviderResponse,
  type NotificationLogger,
} from './delivery-observability';

export interface WelcomeEmailUser {
  id: string;
  email: string;
}

export interface WelcomeEmailServiceOptions {
  prisma: PrismaClient;
  emailAdapter?: EmailAdapter;
  deliveryDispatcher?: WelcomeEmailDeliveryDispatcher;
  pendingAttemptStaleAfterMs?: number;
  appName?: string;
  logger?: NotificationLogger;
}

export interface WelcomeEmailResult {
  deliveryId: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
}

export type WelcomeEmailDeliveryDispatcher = (task: () => Promise<void>) => void | Promise<void>;

const WELCOME_TYPE = NotificationDeliveryType.WELCOME;
const DEFAULT_PENDING_ATTEMPT_STALE_AFTER_MS = 5 * 60 * 1000;

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

function isPendingAttemptStale(attemptedAt: Date, staleAfterMs: number, now: Date): boolean {
  return now.getTime() - attemptedAt.getTime() >= staleAfterMs;
}

export class WelcomeEmailService {
  private readonly appName: string;
  private readonly logger: NotificationLogger;
  private readonly deliveryDispatcher: WelcomeEmailDeliveryDispatcher;
  private readonly pendingAttemptStaleAfterMs: number;

  constructor(private readonly options: WelcomeEmailServiceOptions) {
    this.appName = options.appName ?? 'TaskForge';
    this.logger = options.logger ?? console;
    this.pendingAttemptStaleAfterMs =
      options.pendingAttemptStaleAfterMs ?? DEFAULT_PENDING_ATTEMPT_STALE_AFTER_MS;
    this.deliveryDispatcher =
      options.deliveryDispatcher ??
      (task => {
        queueMicrotask(() => {
          void task().catch(error => {
            this.logger.error('[notifications] Welcome email delivery task failed', {
              error: resolveErrorMessage(error),
            });
          });
        });
      });
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
    if (latestAttempt?.status === 'SENT') {
      this.logger.info('[notifications] Welcome email already queued or sent; skipping duplicate', {
        userId: user.id,
        deliveryId: delivery.id,
      });
      return { deliveryId: delivery.id, status: 'skipped' };
    }

    if (latestAttempt?.status === 'PENDING') {
      const now = new Date();

      if (!isPendingAttemptStale(latestAttempt.attemptedAt, this.pendingAttemptStaleAfterMs, now)) {
        this.logger.info('[notifications] Welcome email already queued or sent; skipping duplicate', {
          userId: user.id,
          deliveryId: delivery.id,
        });
        return { deliveryId: delivery.id, status: 'skipped' };
      }

      await this.options.prisma.notificationDeliveryAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          errorCode: 'StalePendingAttempt',
          errorMessage: 'Pending welcome email attempt expired before reaching a terminal status.',
        },
      });

      this.logger.error('[notifications] Welcome email pending attempt expired before delivery', {
        userId: user.id,
        deliveryId: delivery.id,
        attemptId: latestAttempt.id,
      });
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
          status: NotificationDeliveryStatus.PENDING,
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

    await this.deliveryDispatcher(async () => {
      await this.deliverWelcomeEmailAttempt(user, recipient, attempt.id);
    });

    return { deliveryId: delivery.id, status: 'queued' };
  }

  private async deliverWelcomeEmailAttempt(
    user: WelcomeEmailUser,
    recipient: string,
    attemptId: string,
  ): Promise<void> {
    const emailAdapter = this.options.emailAdapter ?? createDefaultEmailAdapter();
    let message;
    try {
      message = renderWelcomeTemplate({ appName: this.appName, recipientEmail: recipient });
    } catch (error) {
      await this.recordFailedWelcomeAttempt({
        userId: user.id,
        attemptId,
        provider: 'smtp',
        failure: classifyDeliveryFailure(error, { code: 'TEMPLATE_RENDER_FAILED', retryable: false }),
      });
      return;
    }

    let providerResponse: Awaited<ReturnType<EmailAdapter['sendMail']>>;
    try {
      providerResponse = await emailAdapter.sendMail({
        to: recipient,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      await this.recordFailedWelcomeAttempt({
        userId: user.id,
        attemptId,
        provider: 'smtp',
        failure: classifyDeliveryFailure(error),
      });
      return;
    }

    const providerMetadata = sanitizeProviderResponse(providerResponse);
    await this.options.prisma.notificationDeliveryAttempt.update({
      where: { id: attemptId },
      data: {
        status: NotificationDeliveryStatus.SENT,
        deliveredAt: new Date(),
        providerMessageId: providerResponse?.providerMessageId ?? null,
        ...(providerMetadata ? { providerMetadata } : {}),
      },
    });

    logDeliveryFinished(this.logger, {
      notificationType: NotificationDeliveryType.WELCOME,
      userId: user.id,
      deliveryStatus: NotificationDeliveryStatus.SENT,
      provider: 'smtp',
      providerMessageId: providerResponse?.providerMessageId ?? null,
      providerResponse: providerMetadata,
    });
  }

  private async recordFailedWelcomeAttempt(input: {
    userId: string;
    attemptId: string;
    provider: string;
    failure: ReturnType<typeof classifyDeliveryFailure>;
  }): Promise<void> {
    await this.options.prisma.notificationDeliveryAttempt.update({
      where: { id: input.attemptId },
      data: {
        status: NotificationDeliveryStatus.FAILED,
        errorCode: input.failure.code,
        errorMessage: input.failure.message,
        providerMetadata: input.failure.providerMetadata,
      },
    });

    logDeliveryFinished(this.logger, {
      notificationType: NotificationDeliveryType.WELCOME,
      userId: input.userId,
      deliveryStatus: NotificationDeliveryStatus.FAILED,
      provider: input.provider,
      providerErrorCode: input.failure.code,
      retryable: input.failure.retryable,
      providerResponse: input.failure.providerMetadata,
    });
  }
}
