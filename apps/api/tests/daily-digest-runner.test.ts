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
    expect(await prisma.notificationDeliveryAttempt.count()).toBe(1);
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
});
