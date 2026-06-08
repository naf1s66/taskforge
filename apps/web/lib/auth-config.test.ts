import type { AdapterUser } from 'next-auth/adapters';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    account: {
      upsert: vi.fn(),
    },
  };

  let resolveSchedule: () => void = () => undefined;
  const schedulePromise = new Promise<void>(resolve => {
    resolveSchedule = resolve;
  });

  return {
    prisma,
    resolveSchedule: () => resolveSchedule(),
    createUser: vi.fn(async (user: AdapterUser) => ({
      ...user,
      id: 'created-user-id',
      email: user.email ?? 'oauth@example.com',
    })),
    scheduleWelcomeEmail: vi.fn(() => schedulePromise),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: () => ({
    createUser: mocks.createUser,
  }),
}));
vi.mock('./prisma', () => ({
  getPrismaClient: () => mocks.prisma,
}));
vi.mock('./welcome-email', () => ({
  scheduleWelcomeEmail: mocks.scheduleWelcomeEmail,
}));

import { authConfig } from './auth-config';

describe('authConfig adapter', () => {
  it('does not install a credentials placeholder provider when OAuth secrets are absent', () => {
    expect(authConfig.providers).toEqual([]);
  });

  it('does not wait for welcome scheduling before returning an OAuth-created user', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);

    const createUser = authConfig.adapter?.createUser;
    if (!createUser) {
      throw new Error('Expected auth adapter createUser to be configured');
    }

    const created = await Promise.race([
      createUser({
        id: 'provider-user-id',
        email: 'OAuth@Example.com',
        emailVerified: new Date(),
      }),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 20)),
    ]);

    expect(created).toEqual(
      expect.objectContaining({
        id: 'created-user-id',
        email: 'oauth@example.com',
      }),
    );
    expect(mocks.scheduleWelcomeEmail).toHaveBeenCalledWith({
      id: 'created-user-id',
      email: 'oauth@example.com',
    });

    mocks.resolveSchedule();
  });
});
