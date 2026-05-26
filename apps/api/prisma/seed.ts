import { PrismaClient } from '@prisma/client';

import { createPasswordHasher } from '../src/auth/password';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'demo@taskforge.dev';
  const demoPassword = process.env.SEED_USER_PASSWORD ?? 'Demo1234!';
  const digestSmokeTaskId = '00000000-0000-4000-8000-000000000510';
  const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '', 10);
  const hasher = createPasswordHasher(Number.isFinite(saltRounds) && saltRounds > 0 ? saltRounds : 10);

  const passwordHash = await hasher.hash(demoPassword);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: 'Taskforge Demo',
      passwordHash,
      emailVerified: new Date('2026-05-01T00:00:00.000Z'),
    },
    create: {
      email: demoEmail,
      name: 'Taskforge Demo',
      passwordHash,
      emailVerified: new Date('2026-05-01T00:00:00.000Z'),
    },
  });

  await prisma.emailPreference.upsert({
    where: { userId: demoUser.id },
    update: {
      welcomeEmailEnabled: true,
      dailyDigestEnabled: false,
      dailyDigestHourUtc: null,
      dailyDigestTimezone: 'UTC',
    },
    create: {
      userId: demoUser.id,
      welcomeEmailEnabled: true,
      dailyDigestEnabled: false,
      dailyDigestHourUtc: null,
      dailyDigestTimezone: 'UTC',
    },
  });

  await prisma.task.upsert({
    where: { id: digestSmokeTaskId },
    update: {
      userId: demoUser.id,
      title: 'Email digest HTTP smoke task',
      description: 'Seeded task used by apps/api/tests/email.http for MailHog verification.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date('2026-05-26T13:00:00.000Z'),
      boardOrder: 0,
    },
    create: {
      id: digestSmokeTaskId,
      userId: demoUser.id,
      title: 'Email digest HTTP smoke task',
      description: 'Seeded task used by apps/api/tests/email.http for MailHog verification.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date('2026-05-26T13:00:00.000Z'),
      boardOrder: 0,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
