import type { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __TEST_PRISMA__: PrismaClient | undefined;
}

export function getTestPrisma(): PrismaClient {
  if (!globalThis.__TEST_PRISMA__) {
    throw new Error('Test Prisma client has not been initialised. Ensure tests/setup.ts has run.');
  }
  return globalThis.__TEST_PRISMA__;
}

export type { PrismaClient } from '@prisma/client';
