import { NotificationDeliveryStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { SendMailInput } from '../src/email/types';
import { DailyDigestRunner } from '../src/notifications/daily-digest-runner';
import { getTestPrisma } from './utils/prisma';

async function createDigestUser(options: {
  dailyDigestEnabled?: boolean;
  dailyDigestHourUtc?: number | null;
  email?: string;
  emailVerified?: Date | null;
  task?: boolean;
  taskDueDate?: Date;
}) {
  const prisma = getTestPrisma();
  const user = await prisma.user.create({
    data: {
      email: options.email ?? `digest-${randomUUID()}@taskforge.dev`,
      emailVerified: options.emailVerified === undefined ? new Date('2026-05-01T00:00:00.000Z') : options.emailVerified,
    },
  });
  await prisma.emailPreference.create({
    data: {
      userId: user.id,
      dailyDigestEnabled: options.dailyDigestEnabled ?? true,
      dailyDigestHourUtc: options.dailyDigestHourUtc,
    },
  });

  if (options.task ?? true) {
    await prisma.task.create({
      data: {
        userId: user.id,
        title: `Digest task ${user.id}`,
        status: 'TODO',
        priority: 'HIGH',
        dueDate: options.taskDueDate ?? new Date('2026-05-19T12:00:00.000Z'),
      },
    });
  }

  return user;
}

describe('DailyDigestRunner', () => {
  const sent: string[] = [];
  const sentMessages: SendMailInput[] = [];

  beforeEach(async () => {
    const prisma = getTestPrisma();
    sent.length = 0;
    sentMessages.length = 0;
    await prisma.notificationDeliveryAttempt.deleteMany();
    await prisma.notificationDelivery.deleteMany();
    await prisma.emailPreference.deleteMany();
    await prisma.taskTag.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  it('runs deterministically with dry run and does not persist deliveries', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'ok@taskforge.dev' });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    const result = await runner.run({ digestDate: '2026-05-19', dryRun: true, sendLimit: 100 });

    expect(result.sent).toBe(1);
    expect(await prisma.notificationDelivery.count()).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it('applies send budget during dry runs without persisting deliveries', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'dry-budget-a@taskforge.dev' });
    await createDigestUser({ email: 'dry-budget-b@taskforge.dev' });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    const result = await runner.run({ digestDate: '2026-05-19', dryRun: true, sendLimit: 1 });

    expect(result.sent).toBe(1);
    expect(result.budgetSkipped).toBe(1);
    expect(await prisma.notificationDelivery.count()).toBe(0);
    expect(await prisma.notificationDeliveryAttempt.count()).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it('is idempotent for the same digest date and user', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'a@taskforge.dev' });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    await runner.run({ digestDate: '2026-05-19' });
    const second = await runner.run({ digestDate: '2026-05-19' });

    expect(second.skipped).toBeGreaterThanOrEqual(1);
    const attempts = await prisma.notificationDeliveryAttempt.findMany();
    expect(attempts.filter(attempt => attempt.status === NotificationDeliveryStatus.SENT)).toHaveLength(1);
  });

  it('stores sanitized provider metadata for successful sends', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'metadata@taskforge.dev' });

    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: {
        sendMail: async () => ({
          providerMessageId: '<digest-message-id>',
          providerMetadata: {
            acceptedCount: 1,
            rejectedCount: 0,
            response: '250 queued',
          },
        }),
      },
    });

    await runner.run({ digestDate: '2026-05-19' });
    const attempt = await prisma.notificationDeliveryAttempt.findFirstOrThrow();

    expect(attempt.providerMessageId).toBe('<digest-message-id>');
    expect(attempt.providerMetadata).toMatchObject({
      acceptedCount: 1,
      rejectedCount: 0,
      response: '250 queued',
    });
  });

  it('counts failed provider attempts against the send budget', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'budget-a@taskforge.dev' });
    await createDigestUser({ email: 'budget-b@taskforge.dev' });

    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: {
        sendMail: async () => {
          throw new Error('SMTP unavailable');
        },
      },
    });
    const result = await runner.run({ digestDate: '2026-05-19', sendLimit: 1 });

    expect(result.failed).toBe(1);
    expect(result.budgetSkipped).toBe(1);
    const attempts = await prisma.notificationDeliveryAttempt.findMany();
    expect(attempts).toHaveLength(2);
    expect(attempts).toContainEqual(expect.objectContaining({
      status: NotificationDeliveryStatus.SKIPPED,
      errorCode: 'BUDGET_SKIPPED',
    }));
  });

  it('halts remaining sends after provider quota exhaustion and records skipped attempts', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'quota-classification@taskforge.dev' });
    await createDigestUser({ email: 'quota-skipped-a@taskforge.dev' });
    await createDigestUser({ email: 'quota-skipped-b@taskforge.dev' });

    let sendCount = 0;
    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: {
        sendMail: async () => {
          sendCount += 1;
          throw new Error('Resend quota exceeded for this account');
        },
      },
    });

    const result = await runner.run({ digestDate: '2026-05-19', sendLimit: 10 });
    const attempts = await prisma.notificationDeliveryAttempt.findMany({
      orderBy: { attemptedAt: 'asc' },
      select: { errorCode: true, providerMetadata: true, status: true },
    });

    expect(sendCount).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.providerQuotaSkipped).toBe(2);
    const failedAttempt = attempts.find(attempt => attempt.status === NotificationDeliveryStatus.FAILED);
    const skippedAttempts = attempts.filter(attempt => attempt.status === NotificationDeliveryStatus.SKIPPED);
    expect(failedAttempt?.errorCode).toBe('PROVIDER_QUOTA_EXHAUSTED');
    expect(failedAttempt?.providerMetadata).toMatchObject({ providerClassifiedCode: 'PROVIDER_QUOTA_EXHAUSTED' });
    expect(skippedAttempts).toHaveLength(2);
    expect(skippedAttempts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        errorCode: 'PROVIDER_QUOTA_EXHAUSTED',
        providerMetadata: expect.objectContaining({ skipReason: 'provider_quota_exhausted' }),
      }),
    ]));
  });

  it('classifies provider rate-limit failures separately from quota failures', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'rate-classification@taskforge.dev' });

    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: {
        sendMail: async () => {
          throw new Error('429 rate limit exceeded');
        },
      },
    });

    await runner.run({ digestDate: '2026-05-19', sendLimit: 10 });
    const attempt = await prisma.notificationDeliveryAttempt.findFirstOrThrow({
      select: { errorCode: true, providerMetadata: true },
    });

    expect(attempt.errorCode).toBe('PROVIDER_RATE_LIMITED');
    expect(attempt.providerMetadata).toMatchObject({ providerClassifiedCode: 'PROVIDER_RATE_LIMITED' });
  });

  it('records template rendering failures without sending provider mail', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'template-failure@taskforge.dev' });
    const sendMail = jest.fn();

    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: { sendMail },
      renderDailyDigestTemplate: () => {
        throw new Error('template render failed before provider send');
      },
    });

    const result = await runner.run({ digestDate: '2026-05-19', sendLimit: 10 });
    const attempt = await prisma.notificationDeliveryAttempt.findFirstOrThrow();

    expect(result.failed).toBe(1);
    expect(sendMail).not.toHaveBeenCalled();
    expect(attempt.status).toBe(NotificationDeliveryStatus.FAILED);
    expect(attempt.errorCode).toBe('TEMPLATE_RENDER_FAILED');
    expect(attempt.providerMetadata).toMatchObject({
      providerClassifiedCode: 'TEMPLATE_RENDER_FAILED',
      messageSnippet: 'template render failed before provider send',
    });
  });

  it('classifies provider auth and recipient failures separately', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'auth-classification@taskforge.dev' });
    await createDigestUser({ email: 'recipient-classification@taskforge.dev' });

    let sendCount = 0;
    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: {
        sendMail: async () => {
          sendCount += 1;
          if (sendCount === 1) {
            throw new Error('SMTP unauthorized credentials');
          }
          throw new Error('550 invalid recipient');
        },
      },
    });

    await runner.run({ digestDate: '2026-05-19', sendLimit: 10 });
    const attempts = await prisma.notificationDeliveryAttempt.findMany({
      orderBy: { attemptedAt: 'asc' },
      select: { errorCode: true, providerMetadata: true },
    });

    expect(attempts[0]?.errorCode).toBe('PROVIDER_AUTH_FAILED');
    expect(attempts[1]?.errorCode).toBe('RECIPIENT_REJECTED');
    expect(attempts[0]?.providerMetadata).toMatchObject({ providerClassifiedCode: 'PROVIDER_AUTH_FAILED' });
    expect(attempts[1]?.providerMetadata).toMatchObject({ providerClassifiedCode: 'RECIPIENT_REJECTED' });
  });

  it('enforces send budget across repeated runs for the same digest date', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'repeat-budget-a@taskforge.dev' });
    await createDigestUser({ email: 'repeat-budget-b@taskforge.dev' });
    await createDigestUser({ email: 'repeat-budget-c@taskforge.dev' });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    const first = await runner.run({ digestDate: '2026-05-19', sendLimit: 2 });
    const second = await runner.run({ digestDate: '2026-05-19', sendLimit: 2 });

    expect(first.sent).toBe(2);
    expect(first.budgetSkipped).toBe(1);
    expect(second.sent).toBe(0);
    expect(second.duplicateSkipped).toBe(2);
    expect(second.budgetSkipped).toBe(1);
    expect(await prisma.notificationDeliveryAttempt.count()).toBe(3);
  });

  it('enforces send budget across concurrent runs for the same digest date', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ email: 'concurrent-budget-a@taskforge.dev' });
    await createDigestUser({ email: 'concurrent-budget-b@taskforge.dev' });

    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: {
        sendMail: async msg => {
          sent.push(msg.to);
          await new Promise(resolve => setTimeout(resolve, 50));
        },
      },
    });

    const [first, second] = await Promise.all([
      runner.run({ digestDate: '2026-05-19', sendLimit: 1 }),
      runner.run({ digestDate: '2026-05-19', sendLimit: 1 }),
    ]);

    expect(first.sent + second.sent).toBe(1);
    expect(first.budgetSkipped + second.budgetSkipped).toBeGreaterThanOrEqual(1);
    expect(sent).toHaveLength(1);
    expect(await prisma.notificationDeliveryAttempt.count()).toBe(2);
  });

  it('skips users that are disabled, unverified, off-hour, undeliverable, or empty', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({ dailyDigestEnabled: false, email: 'disabled@taskforge.dev' });
    await createDigestUser({ email: 'unverified@taskforge.dev', emailVerified: null });
    await createDigestUser({ dailyDigestHourUtc: 9, email: 'later@taskforge.dev' });
    await createDigestUser({ email: 'placeholder@example.com' });
    await createDigestUser({ email: 'empty@taskforge.dev', task: false });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    const result = await runner.run({ digestDate: '2026-05-19', digestHourUtc: 8 });

    expect(result.sent).toBe(0);
    expect(result.preferenceSkipped).toBe(4);
    expect(result.noContentSkipped).toBe(1);
    expect(sent).toHaveLength(0);
  });

  it('skips in-flight pending attempts for the same digest date and user', async () => {
    const prisma = getTestPrisma();
    const user = await createDigestUser({ email: 'pending@taskforge.dev' });
    const delivery = await prisma.notificationDelivery.create({
      data: {
        userId: user.id,
        idempotencyKey: `digest:2026-05-19:${user.id}`,
        type: 'DAILY_DIGEST',
        recipient: user.email,
      },
    });
    await prisma.notificationDeliveryAttempt.create({
      data: {
        deliveryId: delivery.id,
        attemptNumber: 1,
        type: 'DAILY_DIGEST',
        recipient: user.email,
        provider: 'smtp',
        status: 'PENDING',
      },
    });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    const result = await runner.run({ digestDate: '2026-05-19' });

    expect(result.duplicateSkipped).toBe(1);
    expect(sent).toHaveLength(0);
    expect(await prisma.notificationDeliveryAttempt.count()).toBe(1);
  });

  it('queries the requested digest date in each user timezone', async () => {
    const prisma = getTestPrisma();
    await createDigestUser({
      email: 'kiritimati@taskforge.dev',
      taskDueDate: new Date('2026-05-18T10:30:00.000Z'),
    });
    const user = await prisma.user.findFirstOrThrow({ where: { email: 'kiritimati@taskforge.dev' } });
    await prisma.emailPreference.update({
      where: { userId: user.id },
      data: { dailyDigestTimezone: 'Pacific/Kiritimati' },
    });

    const runner = new DailyDigestRunner({
      prisma,
      emailAdapter: {
        sendMail: async msg => {
          sentMessages.push(msg);
        },
      },
    });

    await runner.run({ digestDate: '2026-05-19' });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.text).toContain('Due today: 1');
    expect(sentMessages[0]?.text).not.toContain('Overdue: 1');
  });

  it('skips users with invalid timezones without aborting the digest run', async () => {
    const prisma = getTestPrisma();
    const invalidTimezoneUser = await createDigestUser({ email: 'invalid-zone@taskforge.dev' });
    await createDigestUser({ email: 'valid-zone@taskforge.dev' });
    await prisma.emailPreference.update({
      where: { userId: invalidTimezoneUser.id },
      data: { dailyDigestTimezone: 'Not/A_Timezone' },
    });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    const result = await runner.run({ digestDate: '2026-05-19' });

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.preferenceSkipped).toBe(1);
    expect(sent).toEqual(['valid-zone@taskforge.dev']);
  });
});
