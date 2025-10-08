import { PrismaClient } from '@prisma/client';

import { createPasswordHasher } from '../src/auth/password';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'demo@taskforge.dev';
  const demoPassword = process.env.SEED_USER_PASSWORD ?? 'Demo1234!';
  const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '', 10);
  const hasher = createPasswordHasher(Number.isFinite(saltRounds) && saltRounds > 0 ? saltRounds : 10);

  const passwordHash = await hasher.hash(demoPassword);

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: 'Taskforge Demo',
      passwordHash,
    },
    create: {
      email: demoEmail,
      name: 'Taskforge Demo',
      passwordHash,
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
