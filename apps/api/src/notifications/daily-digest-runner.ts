import { NotificationDeliveryStatus, NotificationDeliveryType, type PrismaClient } from '@prisma/client';

import type { EmailAdapter } from '../email/types';
import { renderDailyDigestTemplate } from '../email/templates';
import { DailyDigestQueryService } from './digest-query-service';

export interface DailyDigestRunnerOptions {
  prisma: PrismaClient;
  emailAdapter: EmailAdapter;
}

export interface DailyDigestRunInput {
  digestDate: string;
  now?: Date;
  dryRun?: boolean;
  sendLimit?: number;
}

export interface DailyDigestRunResult {
  digestDate: string;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
}

export class DailyDigestRunner {
  private readonly queryService: DailyDigestQueryService;

  constructor(private readonly options: DailyDigestRunnerOptions) {
    this.queryService = new DailyDigestQueryService(options.prisma);
  }

  async run(input: DailyDigestRunInput): Promise<DailyDigestRunResult> {
    const now = input.now ?? new Date(`${input.digestDate}T12:00:00.000Z`);
    const sendLimit = Math.max(0, input.sendLimit ?? 100);
    const dryRun = input.dryRun ?? false;
    const users = await this.options.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailPreference: { select: { dailyDigestEnabled: true, dailyDigestTimezone: true } },
      },
      orderBy: { id: 'asc' },
    });

    let attempted = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      if (sent >= sendLimit) {
        skipped += 1;
        continue;
      }

      attempted += 1;
      const isDigestEnabled = user.emailPreference?.dailyDigestEnabled ?? false;
      const recipient = normalizeDeliverableEmail(user.email);
      if (!user.emailVerified || !isDigestEnabled || !recipient) {
        skipped += 1;
        continue;
      }

      const idempotencyKey = `digest:${input.digestDate}:${user.id}`;
      const existing = await this.options.prisma.notificationDelivery.findUnique({
        where: { idempotencyKey },
        include: { attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 } },
      });

      if (existing?.attempts[0]?.status === NotificationDeliveryStatus.SENT) {
        skipped += 1;
        continue;
      }

      const digest = await this.queryService.queryForUser(user.id, {
        now,
        timezone: user.emailPreference?.dailyDigestTimezone,
      });
      const template = renderDailyDigestTemplate({
        recipientEmail: recipient,
        digestDate: input.digestDate,
        digest,
      });

      if (dryRun) {
        sent += 1;
        continue;
      }

      const delivery =
        existing ??
        (await this.options.prisma.notificationDelivery.create({
          data: {
            userId: user.id,
            type: NotificationDeliveryType.DAILY_DIGEST,
            recipient,
            idempotencyKey,
          },
        }));

      const nextAttempt = (existing?.attempts[0]?.attemptNumber ?? 0) + 1;
      const attempt = await this.options.prisma.notificationDeliveryAttempt.create({
        data: {
          deliveryId: delivery.id,
          attemptNumber: nextAttempt,
          type: NotificationDeliveryType.DAILY_DIGEST,
          recipient,
          provider: 'smtp',
          status: NotificationDeliveryStatus.PENDING,
        },
      });

      try {
        await this.options.emailAdapter.sendMail({
          to: recipient,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });

        await this.options.prisma.notificationDeliveryAttempt.update({
          where: { id: attempt.id },
          data: { status: NotificationDeliveryStatus.SENT, deliveredAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        await this.options.prisma.notificationDeliveryAttempt.update({
          where: { id: attempt.id },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            errorCode: 'SMTP_SEND_FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });
        failed += 1;
      }
    }

    return { digestDate: input.digestDate, attempted, sent, skipped, failed };
  }
}

function normalizeDeliverableEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@') || normalized.endsWith('@example.com')) {
    return null;
  }
  return normalized;
}
