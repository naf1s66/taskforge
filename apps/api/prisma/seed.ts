import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'demo@taskforge.dev';

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      name: 'Taskforge Demo',
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
