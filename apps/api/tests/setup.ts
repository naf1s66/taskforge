/// <reference path="./types.d.ts" />

import { execSync } from 'node:child_process';

import { config as loadEnv } from 'dotenv-flow';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const appRoot = process.cwd();

loadEnv({ node_env: 'test', path: appRoot });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
process.env.SESSION_BRIDGE_SECRET = process.env.SESSION_BRIDGE_SECRET ?? 'test-bridge-secret';

jest.setTimeout(120_000);

declare global {
  // eslint-disable-next-line no-var
  var __TEST_PRISMA__: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __TEST_DB_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

const truncateTables = [
  '"TaskTag"',
  '"Task"',
  '"Tag"',
  '"Session"',
  '"Account"',
  '"VerificationToken"',
  '"User"',
];

let prisma: PrismaClient;
let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withTmpFs('/var/lib/postgresql/data')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  execSync('pnpm prisma migrate deploy', {
    cwd: appRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });

  prisma = new PrismaClient();
  await prisma.$connect();
  globalThis.__TEST_PRISMA__ = prisma;
  globalThis.__TEST_DB_CONTAINER__ = container;
});

beforeEach(async () => {
  if (!prisma) {
    throw new Error('Prisma client is not initialised for the test environment.');
  }

  const truncateStatement = `TRUNCATE TABLE ${truncateTables.join(', ')} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(truncateStatement);
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  if (container) {
    await container.stop();
  }
  globalThis.__TEST_PRISMA__ = undefined;
  globalThis.__TEST_DB_CONTAINER__ = undefined;
});
