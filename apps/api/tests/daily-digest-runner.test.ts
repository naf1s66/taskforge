import { NotificationDeliveryStatus } from '@prisma/client';

import { DailyDigestRunner } from '../src/notifications/daily-digest-runner';
import { getTestPrisma } from './utils/prisma';

describe('DailyDigestRunner', () => {
  const sent: string[] = [];

  beforeEach(async () => {
    const prisma = getTestPrisma();
    sent.length = 0;
    await prisma.notificationDeliveryAttempt.deleteMany();
    await prisma.notificationDelivery.deleteMany();
    await prisma.emailPreference.deleteMany();
    await prisma.taskTag.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  it('runs deterministically with dry run and does not persist deliveries', async () => {
    const prisma = getTestPrisma();
    const user = await prisma.user.create({ data: { email: 'ok@example.org', emailVerified: new Date() } });
    await prisma.emailPreference.create({ data: { userId: user.id, dailyDigestEnabled: true } });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    const result = await runner.run({ digestDate: '2026-05-19', dryRun: true, sendLimit: 100 });

    expect(result.sent).toBe(1);
    expect(await prisma.notificationDelivery.count()).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it('is idempotent for the same digest date and user', async () => {
    const prisma = getTestPrisma();
    const user = await prisma.user.create({ data: { email: 'a@b.com', emailVerified: new Date() } });
    await prisma.emailPreference.create({ data: { userId: user.id, dailyDigestEnabled: true } });

    const runner = new DailyDigestRunner({ prisma, emailAdapter: { sendMail: async msg => { sent.push(msg.to); } } });
    await runner.run({ digestDate: '2026-05-19' });
    const second = await runner.run({ digestDate: '2026-05-19' });

    expect(second.skipped).toBeGreaterThanOrEqual(1);
    const attempts = await prisma.notificationDeliveryAttempt.findMany();
    expect(attempts.filter(attempt => attempt.status === NotificationDeliveryStatus.SENT)).toHaveLength(1);
  });
});
