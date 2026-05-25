import {
  NotificationDeliveryStatus,
  NotificationDeliveryType,
  Prisma,
  type NotificationDelivery,
  type NotificationDeliveryAttempt,
  type PrismaClient,
} from '@prisma/client';

import type { EmailAdapter } from '../email/types';
import { renderDailyDigestTemplate as defaultRenderDailyDigestTemplate } from '../email/templates';
import {
  classifyDeliveryFailure,
  logDeliveryFinished,
  sanitizeProviderResponse,
  type ClassifiedDeliveryFailure,
  type NotificationLogger,
} from './delivery-observability';
import { DailyDigestQueryService, localDateTimeToUtc } from './digest-query-service';

export interface DailyDigestRunnerOptions {
  prisma: PrismaClient;
  emailAdapter: EmailAdapter;
  logger?: NotificationLogger;
  renderDailyDigestTemplate?: typeof defaultRenderDailyDigestTemplate;
}

export interface DailyDigestRunInput {
  digestDate: string;
  digestHourUtc?: number;
  now?: Date;
  dryRun?: boolean;
  sendLimit?: number;
  userIds?: string[];
}

export interface DailyDigestRunResult {
  digestDate: string;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  budgetSkipped: number;
  providerQuotaSkipped: number;
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
  private readonly logger: NotificationLogger;

  constructor(private readonly options: DailyDigestRunnerOptions) {
    this.queryService = new DailyDigestQueryService(options.prisma);
    this.logger = options.logger ?? console;
  }

  async run(input: DailyDigestRunInput): Promise<DailyDigestRunResult> {
    assertDigestDate(input.digestDate);
    assertDigestHour(input.digestHourUtc);

    const sendLimit = normalizeSendLimit(input.sendLimit);
    const dryRun = input.dryRun ?? false;
    const dryRunConsumedBudget = dryRun ? await countConsumedBudget(this.options.prisma, input.digestDate) : 0;
    const users = await this.options.prisma.user.findMany({
      where: input.userIds?.length ? { id: { in: input.userIds } } : undefined,
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
    let providerQuotaSkipped = 0;
    let duplicateSkipped = 0;
    let preferenceSkipped = 0;
    let noContentSkipped = 0;
    let dryRunReserved = 0;
    let providerQuotaHalt: ClassifiedDeliveryFailure | null = null;

    for (const user of users) {
      attempted += 1;
      const timezone = user.emailPreference?.dailyDigestTimezone ?? 'UTC';
      const now = resolveDigestDateNoon(input.digestDate, timezone, input.now);
      if (!now) {
        skipped += 1;
        preferenceSkipped += 1;
        continue;
      }

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

      if (dryRun) {
        if (dryRunConsumedBudget + dryRunReserved >= sendLimit) {
          skipped += 1;
          budgetSkipped += 1;
          continue;
        }

        this.options.renderDailyDigestTemplate?.({
          recipientEmail: recipient,
          digestDate: input.digestDate,
          digest,
        }) ?? defaultRenderDailyDigestTemplate({
          recipientEmail: recipient,
          digestDate: input.digestDate,
          digest,
        });
        dryRunReserved += 1;
        sent += 1;
        continue;
      }

      if (providerQuotaHalt) {
        const reservation = await reserveSkippedDeliveryAttempt({
          prisma: this.options.prisma,
          digestDate: input.digestDate,
          userId: user.id,
          recipient,
          idempotencyKey,
          errorCode: providerQuotaHalt.code,
          errorMessage: 'Provider quota exhausted earlier in this digest run.',
          providerMetadata: {
            ...providerQuotaHalt.providerMetadata,
            skipReason: 'provider_quota_exhausted',
          },
          provider: 'smtp',
        });

        if (reservation.status === 'duplicate') {
          duplicateSkipped += 1;
        } else {
          providerQuotaSkipped += 1;
        }
        skipped += 1;
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

      const template = await this.renderTemplateForAttempt({
        attemptId: reservation.attempt.id,
        userId: user.id,
        provider: reservation.attempt.provider,
        recipient,
        digestDate: input.digestDate,
        digest,
      });
      if (!template) {
        failed += 1;
        continue;
      }

      let providerResponse: Awaited<ReturnType<EmailAdapter['sendMail']>>;
      try {
        providerResponse = await this.options.emailAdapter.sendMail({
          to: recipient,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
      } catch (error) {
        const failure = classifyDeliveryFailure(error);
        await this.options.prisma.notificationDeliveryAttempt.update({
          where: { id: reservation.attempt.id },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            errorCode: failure.code,
            errorMessage: failure.message,
            providerMetadata: failure.providerMetadata,
          },
        });
        logDeliveryFinished(this.logger, {
          notificationType: NotificationDeliveryType.DAILY_DIGEST,
          userId: user.id,
          deliveryStatus: NotificationDeliveryStatus.FAILED,
          provider: reservation.attempt.provider,
          providerErrorCode: failure.code,
          retryable: failure.retryable,
          providerResponse: failure.providerMetadata,
        });
        failed += 1;
        if (failure.code === 'PROVIDER_QUOTA_EXHAUSTED') {
          providerQuotaHalt = failure;
        }
        continue;
      }

      const providerMetadata = sanitizeProviderResponse(providerResponse);
      await this.options.prisma.notificationDeliveryAttempt.update({
        where: { id: reservation.attempt.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          deliveredAt: new Date(),
          providerMessageId: providerResponse?.providerMessageId ?? null,
          ...(providerMetadata ? { providerMetadata } : {}),
        },
      });
      logDeliveryFinished(this.logger, {
        notificationType: NotificationDeliveryType.DAILY_DIGEST,
        userId: user.id,
        deliveryStatus: NotificationDeliveryStatus.SENT,
        provider: reservation.attempt.provider,
        providerMessageId: providerResponse?.providerMessageId ?? null,
        providerResponse: providerMetadata,
      });
      sent += 1;
    }

    return {
      digestDate: input.digestDate,
      attempted,
      sent,
      skipped,
      failed,
      budgetSkipped,
      providerQuotaSkipped,
      duplicateSkipped,
      preferenceSkipped,
      noContentSkipped,
    };
  }

  private async renderTemplateForAttempt(input: {
    attemptId: string;
    userId: string;
    provider: string;
    recipient: string;
    digestDate: string;
    digest: Parameters<typeof defaultRenderDailyDigestTemplate>[0]['digest'];
  }): Promise<ReturnType<typeof defaultRenderDailyDigestTemplate> | null> {
    try {
      return (this.options.renderDailyDigestTemplate ?? defaultRenderDailyDigestTemplate)({
        recipientEmail: input.recipient,
        digestDate: input.digestDate,
        digest: input.digest,
      });
    } catch (error) {
      const failure = classifyDeliveryFailure(error, { code: 'TEMPLATE_RENDER_FAILED', retryable: false });
      await this.options.prisma.notificationDeliveryAttempt.update({
        where: { id: input.attemptId },
        data: {
          status: NotificationDeliveryStatus.FAILED,
          errorCode: failure.code,
          errorMessage: failure.message,
          providerMetadata: failure.providerMetadata,
        },
      });
      logDeliveryFinished(this.logger, {
        notificationType: NotificationDeliveryType.DAILY_DIGEST,
        userId: input.userId,
        deliveryStatus: NotificationDeliveryStatus.FAILED,
        provider: input.provider,
        providerErrorCode: failure.code,
        retryable: failure.retryable,
        providerResponse: failure.providerMetadata,
      });
      return null;
    }
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

function resolveDigestDateNoon(digestDate: string, timezone: string, now: Date | undefined): Date | null {
  if (now) {
    return now;
  }

  try {
    return digestDateNoonInTimezone(digestDate, timezone);
  } catch (error) {
    if (isInvalidTimezoneError(error)) {
      return null;
    }

    throw error;
  }
}

function isInvalidTimezoneError(error: unknown): boolean {
  return error instanceof RangeError;
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
      await createSkippedAttempt(tx, delivery, {
        errorCode: 'BUDGET_SKIPPED',
        errorMessage: 'Configured daily email send budget exhausted before this digest could be sent.',
        provider: 'system',
        providerMetadata: {
          skipReason: 'budget_exhausted',
          digestDate: input.digestDate,
          sendLimit: input.sendLimit,
        },
      });
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

async function reserveSkippedDeliveryAttempt(input: {
  prisma: PrismaClient;
  digestDate: string;
  userId: string;
  recipient: string;
  idempotencyKey: string;
  errorCode: string;
  errorMessage: string;
  providerMetadata: Prisma.JsonObject;
  provider: string;
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

    const attempt = await createSkippedAttempt(tx, delivery, {
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      provider: input.provider,
      providerMetadata: input.providerMetadata,
    });

    return attempt ? { status: 'reserved', attempt } : { status: 'duplicate' };
  });
}

async function createSkippedAttempt(
  tx: Prisma.TransactionClient,
  delivery: DeliveryWithLatestAttempt,
  input: {
    errorCode: string;
    errorMessage: string;
    provider: string;
    providerMetadata: Prisma.JsonObject;
  },
): Promise<NotificationDeliveryAttempt | null> {
  const latestAttempt = delivery.attempts[0];
  if (latestAttempt?.status === NotificationDeliveryStatus.SKIPPED && latestAttempt.errorCode === input.errorCode) {
    return null;
  }

  return tx.notificationDeliveryAttempt.create({
    data: {
      deliveryId: delivery.id,
      attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
      type: NotificationDeliveryType.DAILY_DIGEST,
      recipient: delivery.recipient,
      provider: input.provider,
      status: NotificationDeliveryStatus.SKIPPED,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      providerMetadata: input.providerMetadata,
    },
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
