import {
  NotificationDeliveryStatus,
  NotificationDeliveryType,
  Prisma,
  type NotificationDelivery,
  type NotificationDeliveryAttempt,
  type PrismaClient,
} from '@prisma/client';

import type { EmailAdapter } from '../email/types';
import { renderDailyDigestTemplate } from '../email/templates';
import { DailyDigestQueryService, localDateTimeToUtc } from './digest-query-service';

export interface DailyDigestRunnerOptions {
  prisma: PrismaClient;
  emailAdapter: EmailAdapter;
}

export interface DailyDigestRunInput {
  digestDate: string;
  digestHourUtc?: number;
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
  budgetSkipped: number;
  duplicateSkipped: number;
  preferenceSkipped: number;
  noContentSkipped: number;
}

type DeliveryWithLatestAttempt = NotificationDelivery & {
  attempts: NotificationDeliveryAttempt[];
};

type ReserveAttemptResult =
  | { status: 'reserved'; attempt: NotificationDeliveryAttempt }
  | { status: 'budget_exhausted' }
  | { status: 'duplicate' };

export class DailyDigestRunner {
  private readonly queryService: DailyDigestQueryService;

  constructor(private readonly options: DailyDigestRunnerOptions) {
    this.queryService = new DailyDigestQueryService(options.prisma);
  }

  async run(input: DailyDigestRunInput): Promise<DailyDigestRunResult> {
    assertDigestDate(input.digestDate);
    assertDigestHour(input.digestHourUtc);

    const sendLimit = normalizeSendLimit(input.sendLimit);
    const dryRun = input.dryRun ?? false;
    const dryRunConsumedBudget = dryRun ? await countConsumedBudget(this.options.prisma, input.digestDate) : 0;
    const users = await this.options.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailPreference: { select: { dailyDigestEnabled: true, dailyDigestHourUtc: true, dailyDigestTimezone: true } },
      },
      orderBy: { id: 'asc' },
    });

    let attempted = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let budgetSkipped = 0;
    let duplicateSkipped = 0;
    let preferenceSkipped = 0;
    let noContentSkipped = 0;
    let dryRunReserved = 0;

    for (const user of users) {
      attempted += 1;
      const timezone = user.emailPreference?.dailyDigestTimezone ?? 'UTC';
      const now = input.now ?? digestDateNoonInTimezone(input.digestDate, timezone);
      const isDigestEnabled = user.emailPreference?.dailyDigestEnabled ?? false;
      const recipient = normalizeDeliverableEmail(user.email);
      const digestHourMatches =
        input.digestHourUtc === undefined ||
        user.emailPreference?.dailyDigestHourUtc === null ||
        user.emailPreference?.dailyDigestHourUtc === input.digestHourUtc;

      if (!user.emailVerified || !isDigestEnabled || !digestHourMatches || !recipient) {
        skipped += 1;
        preferenceSkipped += 1;
        continue;
      }

      const idempotencyKey = `digest:${input.digestDate}:${user.id}`;
      const existing = await this.options.prisma.notificationDelivery.findUnique({
        where: { idempotencyKey },
        include: { attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 } },
      });

      if (isTerminalOrInFlightDuplicate(existing)) {
        skipped += 1;
        duplicateSkipped += 1;
        continue;
      }

      const digest = await this.queryService.queryForUser(user.id, {
        now,
        timezone,
      });

      if (isDigestEmpty(digest)) {
        skipped += 1;
        noContentSkipped += 1;
        continue;
      }

      const template = renderDailyDigestTemplate({
        recipientEmail: recipient,
        digestDate: input.digestDate,
        digest,
      });

      if (dryRun) {
        if (dryRunConsumedBudget + dryRunReserved >= sendLimit) {
          skipped += 1;
          budgetSkipped += 1;
          continue;
        }

        dryRunReserved += 1;
        sent += 1;
        continue;
      }

      const reservation = await reserveDeliveryAttempt({
        prisma: this.options.prisma,
        digestDate: input.digestDate,
        sendLimit,
        userId: user.id,
        recipient,
        idempotencyKey,
      });

      if (reservation.status === 'budget_exhausted') {
        skipped += 1;
        budgetSkipped += 1;
        continue;
      }

      if (reservation.status === 'duplicate') {
        skipped += 1;
        duplicateSkipped += 1;
        continue;
      }

      try {
        await this.options.emailAdapter.sendMail({
          to: recipient,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });

        await this.options.prisma.notificationDeliveryAttempt.update({
          where: { id: reservation.attempt.id },
          data: { status: NotificationDeliveryStatus.SENT, deliveredAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        await this.options.prisma.notificationDeliveryAttempt.update({
          where: { id: reservation.attempt.id },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            errorCode: 'SMTP_SEND_FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });
        failed += 1;
      }
    }

    return {
      digestDate: input.digestDate,
      attempted,
      sent,
      skipped,
      failed,
      budgetSkipped,
      duplicateSkipped,
      preferenceSkipped,
      noContentSkipped,
    };
  }
}

function assertDigestDate(digestDate: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(digestDate)) {
    throw new Error('digestDate must use YYYY-MM-DD format.');
  }

  const parsed = new Date(`${digestDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== digestDate) {
    throw new Error('digestDate must be a valid calendar date.');
  }
}

function digestDateNoonInTimezone(digestDate: string, timezone: string): Date {
  const [year, month, day] = digestDate.split('-').map(Number);
  return localDateTimeToUtc(year, month, day, 12, timezone);
}

function assertDigestHour(digestHourUtc: number | undefined): void {
  if (digestHourUtc === undefined) {
    return;
  }

  if (!Number.isInteger(digestHourUtc) || digestHourUtc < 0 || digestHourUtc > 23) {
    throw new Error('digestHourUtc must be an integer from 0 through 23.');
  }
}

function normalizeSendLimit(sendLimit: number | undefined): number {
  if (sendLimit === undefined) {
    return 90;
  }

  if (!Number.isInteger(sendLimit) || sendLimit < 0 || !Number.isSafeInteger(sendLimit)) {
    throw new Error('sendLimit must be a non-negative safe integer.');
  }

  return sendLimit;
}

async function countConsumedBudget(prisma: PrismaClient | Prisma.TransactionClient, digestDate: string): Promise<number> {
  return prisma.notificationDeliveryAttempt.count({
    where: {
      status: {
        in: [
          NotificationDeliveryStatus.PENDING,
          NotificationDeliveryStatus.SENT,
          NotificationDeliveryStatus.FAILED,
        ],
      },
      delivery: {
        type: NotificationDeliveryType.DAILY_DIGEST,
        idempotencyKey: { startsWith: `digest:${digestDate}:` },
      },
    },
  });
}

async function reserveDeliveryAttempt(input: {
  prisma: PrismaClient;
  digestDate: string;
  sendLimit: number;
  userId: string;
  recipient: string;
  idempotencyKey: string;
}): Promise<ReserveAttemptResult> {
  return input.prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`digest-budget:${input.digestDate}`}))`;

    const delivery = await tx.notificationDelivery.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        userId: input.userId,
        type: NotificationDeliveryType.DAILY_DIGEST,
        recipient: input.recipient,
        idempotencyKey: input.idempotencyKey,
      },
      update: { recipient: input.recipient },
      include: { attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 } },
    });

    if (isTerminalOrInFlightDuplicate(delivery)) {
      return { status: 'duplicate' };
    }

    const consumedBudget = await countConsumedBudget(tx, input.digestDate);
    if (consumedBudget >= input.sendLimit) {
      return { status: 'budget_exhausted' };
    }

    const nextAttempt = (delivery.attempts[0]?.attemptNumber ?? 0) + 1;
    const attempt = await tx.notificationDeliveryAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptNumber: nextAttempt,
        type: NotificationDeliveryType.DAILY_DIGEST,
        recipient: input.recipient,
        provider: 'smtp',
        status: NotificationDeliveryStatus.PENDING,
      },
    });

    return { status: 'reserved', attempt };
  });
}

function isTerminalOrInFlightDuplicate(delivery: DeliveryWithLatestAttempt | null): boolean {
  const status = delivery?.attempts[0]?.status;
  return status === NotificationDeliveryStatus.SENT || status === NotificationDeliveryStatus.PENDING;
}

function isDigestEmpty(digest: { groups: Array<{ total: number }> }): boolean {
  return digest.groups.every(group => group.total === 0);
}

function normalizeDeliverableEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split('@')[1];
  if (
    !normalized ||
    !normalized.includes('@') ||
    !domain ||
    domain === 'example.com' ||
    domain === 'example.net' ||
    domain === 'example.org' ||
    domain.endsWith('.example') ||
    domain.endsWith('.invalid') ||
    domain.endsWith('.local') ||
    domain.endsWith('.test')
  ) {
    return null;
  }
  return normalized;
}
