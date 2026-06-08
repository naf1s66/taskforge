import { randomUUID } from 'node:crypto';

import type { SuperTest, Test } from 'supertest';

import { getSessionCookieName } from '@taskforge/shared';

import { createDevBypassClientToken } from '../src/auth/dev-bypass-client-token';
import { createTestAgent } from './utils/test-app';
import { loginTestUser, registerTestUser, extractSessionCookie } from './utils/auth';
import { createUser } from './utils/factories';

async function waitForNotificationAttempts(
  prisma: import('./utils/prisma').PrismaClient,
  userId: string,
  expectedCount: number,
) {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId, type: 'WELCOME' },
      include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
    });
    const attemptCount = deliveries.reduce((sum, delivery) => sum + delivery.attempts.length, 0);
    const hasOnlyTerminalAttempts = deliveries.every(delivery =>
      delivery.attempts.every(attempt => attempt.status === 'SENT' || attempt.status === 'FAILED'),
    );

    if (deliveries.length > 0 && attemptCount >= expectedCount && hasOnlyTerminalAttempts) {
      return deliveries;
    }

    await new Promise(resolve => setTimeout(resolve, 25));
  }

  return prisma.notificationDelivery.findMany({
    where: { userId, type: 'WELCOME' },
    include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
  });
}

describe('Auth API', () => {
  let agent: SuperTest<Test>;
  let prisma: import('./utils/prisma').PrismaClient;
  const sessionBridgeSecret = 'test-bridge-secret';
  const devBypassClientSecret = 'test-dev-bypass-client-secret';

  beforeEach(() => {
    const context = createTestAgent({
      sessionBridgeSecret,
      devBypassEnabled: true,
      devBypassClientSecret,
    });
    agent = context.agent;
    prisma = context.prisma;
  });

  const bridgeSession = (payload: { userId: string; email?: string }) =>
    agent
      .post('/api/taskforge/v1/auth/session-bridge')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send(payload);

  it('registers a user, returns tokens, and issues a session cookie', async () => {
    const result = await registerTestUser(agent);

    expect(result.user).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email: expect.stringContaining('@example.com'),
        createdAt: expect.any(String),
      }),
    );
    expect(result.tokens).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
      }),
    );
    expect(extractSessionCookie(result.cookies)).toBeDefined();
  });

  it('records and sends one welcome email after credentials registration', async () => {
    const result = await registerTestUser(agent, { email: 'welcome@example.com' });

    const deliveries = await waitForNotificationAttempts(prisma, result.user.id, 1);

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toEqual(
      expect.objectContaining({
        idempotencyKey: `welcome:${result.user.id}`,
        recipient: 'welcome@example.com',
        type: 'WELCOME',
      }),
    );
    expect(deliveries[0].attempts).toHaveLength(1);
    expect(deliveries[0].attempts[0]).toEqual(
      expect.objectContaining({
        status: 'SENT',
        type: 'WELCOME',
        recipient: 'welcome@example.com',
        errorMessage: null,
      }),
    );
  });

  it('records welcome email failures without blocking credentials registration', async () => {
    const failingContext = createTestAgent({
      sessionBridgeSecret,
      devBypassEnabled: true,
      devBypassClientSecret,
      welcomeEmailAdapter: {
        sendMail: async () => {
          throw new Error('SMTP unavailable');
        },
      },
    });

    const result = await registerTestUser(failingContext.agent, { email: 'welcome-failure@example.com' });
    const deliveries = await waitForNotificationAttempts(failingContext.prisma, result.user.id, 1);

    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].attempts).toHaveLength(1);
    expect(deliveries[0].attempts[0]).toEqual(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: 'PROVIDER_TRANSIENT_FAILURE',
        errorMessage: 'SMTP unavailable',
        providerMetadata: expect.objectContaining({
          providerClassifiedCode: 'PROVIDER_TRANSIENT_FAILURE',
          messageSnippet: 'SMTP unavailable',
        }),
      }),
    );
  });

  it('returns credentials registration before a slow welcome SMTP send resolves', async () => {
    let releaseSend!: () => void;
    const sendStarted = new Promise<void>(resolve => {
      const slowSend = new Promise<void>(sendResolve => {
        releaseSend = sendResolve;
      });

      const nonBlockingContext = createTestAgent({
        sessionBridgeSecret,
        devBypassEnabled: true,
        devBypassClientSecret,
        welcomeEmailAdapter: {
          sendMail: async () => {
            resolve();
            await slowSend;
          },
        },
        welcomeEmailDeliveryDispatcher: task => {
          void task();
        },
      });

      agent = nonBlockingContext.agent;
      prisma = nonBlockingContext.prisma;
    });

    const result = await registerTestUser(agent, { email: 'welcome-slow@example.com' });
    await sendStarted;

    expect(result.tokens.accessToken).toEqual(expect.any(String));

    const pendingDeliveries = await prisma.notificationDelivery.findMany({
      where: { userId: result.user.id, type: 'WELCOME' },
      include: { attempts: true },
    });

    expect(pendingDeliveries).toHaveLength(1);
    expect(pendingDeliveries[0].attempts).toEqual([
      expect.objectContaining({ status: 'PENDING' }),
    ]);

    releaseSend();
    const deliveries = await waitForNotificationAttempts(prisma, result.user.id, 1);

    expect(deliveries[0].attempts[0]).toEqual(
      expect.objectContaining({
        status: 'SENT',
        recipient: 'welcome-slow@example.com',
      }),
    );
  });

  it('records one welcome email for an OAuth-created user and skips duplicate bridge requests', async () => {
    const created = await createUser({
      email: 'oauth-welcome@example.com',
      passwordHash: null,
    });

    await agent
      .post('/api/taskforge/v1/auth/welcome-email')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send({ userId: created.user.id, email: created.user.email })
      .expect(202);

    await agent
      .post('/api/taskforge/v1/auth/welcome-email')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send({ userId: created.user.id, email: created.user.email })
      .expect(202);

    const deliveries = await waitForNotificationAttempts(prisma, created.user.id, 1);

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].attempts).toHaveLength(1);
    expect(deliveries[0]).toEqual(
      expect.objectContaining({
        idempotencyKey: `welcome:${created.user.id}`,
        recipient: 'oauth-welcome@example.com',
        type: 'WELCOME',
      }),
    );
    expect(deliveries[0].attempts[0]).toEqual(
      expect.objectContaining({
        status: 'SENT',
        recipient: 'oauth-welcome@example.com',
      }),
    );
  });

  it('retries stale pending welcome attempts instead of skipping forever', async () => {
    const created = await createUser({
      email: 'oauth-stale-pending@example.com',
      passwordHash: null,
    });
    const staleAttemptedAt = new Date(Date.now() - 10 * 60 * 1000);
    const delivery = await prisma.notificationDelivery.create({
      data: {
        userId: created.user.id,
        idempotencyKey: `welcome:${created.user.id}`,
        type: 'WELCOME',
        recipient: created.user.email,
        attempts: {
          create: {
            attemptNumber: 1,
            type: 'WELCOME',
            recipient: created.user.email,
            status: 'PENDING',
            provider: 'smtp',
            attemptedAt: staleAttemptedAt,
          },
        },
      },
    });

    await agent
      .post('/api/taskforge/v1/auth/welcome-email')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send({ userId: created.user.id, email: created.user.email })
      .expect(202);

    const deliveries = await waitForNotificationAttempts(prisma, created.user.id, 2);

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].id).toBe(delivery.id);
    expect(deliveries[0].attempts).toEqual([
      expect.objectContaining({
        attemptNumber: 1,
        status: 'FAILED',
        errorCode: 'StalePendingAttempt',
      }),
      expect.objectContaining({
        attemptNumber: 2,
        status: 'SENT',
        recipient: 'oauth-stale-pending@example.com',
      }),
    ]);
  });

  it('protects welcome email scheduling with the session bridge secret', async () => {
    const created = await createUser({ email: 'oauth-unauthorized@example.com', passwordHash: null });

    await agent
      .post('/api/taskforge/v1/auth/welcome-email')
      .set('x-session-bridge-secret', 'not-the-secret')
      .send({ userId: created.user.id, email: created.user.email })
      .expect(401);

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId: created.user.id, type: 'WELCOME' },
    });

    expect(deliveries).toHaveLength(0);
  });

  it('skips welcome email attempts when the user preference disables them', async () => {
    const created = await createUser({
      email: 'welcome-disabled@example.com',
      passwordHash: null,
    });

    await prisma.emailPreference.create({
      data: {
        userId: created.user.id,
        welcomeEmailEnabled: false,
        dailyDigestEnabled: false,
      },
    });

    await agent
      .post('/api/taskforge/v1/auth/welcome-email')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send({ userId: created.user.id, email: created.user.email })
      .expect(202);

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId: created.user.id, type: 'WELCOME' },
      include: { attempts: true },
    });

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].attempts).toHaveLength(0);
  });

  it('rejects invalid registration payloads', async () => {
    const invalid = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(invalid.body).toEqual(expect.objectContaining({ error: 'Invalid payload' }));
  });

  it('rejects unknown fields in strict auth payloads', async () => {
    const registered = await registerTestUser(agent, { email: 'strict-auth@example.com' });
    const oauthUser = await createUser({
      email: 'strict-welcome@example.com',
      passwordHash: null,
    });

    await agent
      .post('/api/taskforge/v1/auth/refresh')
      .send({ refreshToken: registered.tokens.refreshToken, unknown: 'field' })
      .expect(400);

    await agent
      .post('/api/taskforge/v1/auth/session-bridge')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send({ userId: registered.user.id, email: registered.user.email, unknown: 'field' })
      .expect(400);

    await agent
      .post('/api/taskforge/v1/auth/welcome-email')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send({ userId: oauthUser.user.id, email: oauthUser.user.email, unknown: 'field' })
      .expect(400);

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { userId: oauthUser.user.id, type: 'WELCOME' },
    });
    expect(deliveries).toHaveLength(0);
  });

  it('prevents duplicate registrations', async () => {
    const existing = await registerTestUser(agent, { email: 'dupe@example.com' });

    const duplicate = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: existing.credentials.email, password: existing.credentials.password })
      .expect(409);

    expect(duplicate.body).toEqual(expect.objectContaining({ error: 'User already exists' }));
  });

  it('logs in an existing user and returns a new token set', async () => {
    const registered = await registerTestUser(agent, { email: 'login@example.com' });

    const login = await loginTestUser(agent, {
      credentials: {
        email: registered.credentials.email,
        password: registered.credentials.password,
      },
    });

    expect(login.user).toEqual(expect.objectContaining({ email: registered.credentials.email }));
    expect(login.tokens).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
      }),
    );
  });

  it('exchanges a refresh token for a new access token', async () => {
    const registered = await registerTestUser(agent, { email: 'refresh@example.com' });

    const response = await agent
      .post('/api/taskforge/v1/auth/refresh')
      .send({ refreshToken: registered.tokens.refreshToken })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email: registered.credentials.email }),
        tokens: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      }),
    );
    expect(extractSessionCookie(response.headers['set-cookie'])).toBeDefined();
  });

  it('rejects invalid refresh tokens', async () => {
    await agent
      .post('/api/taskforge/v1/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' })
      .expect(401);
  });

  it('rejects login attempts for unknown users', async () => {
    await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email: 'missing@example.com', password: 'Secret123!' })
      .expect(401);
  });

  it('rejects invalid login attempts', async () => {
    const registered = await registerTestUser(agent, { email: 'invalid@example.com' });

    await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email: registered.credentials.email, password: 'WrongPassword1' })
      .expect(401);
  });

  it('returns the authenticated user for /auth/me', async () => {
    const registered = await registerTestUser(agent, { email: 'profile@example.com' });

    const profile = await agent
      .get('/api/taskforge/v1/auth/me')
      .set('Authorization', `Bearer ${registered.tokens.accessToken}`)
      .expect(200);

    expect(profile.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email: registered.credentials.email }),
      }),
    );
  });

  it('allows access to tasks when authenticated', async () => {
    const registered = await registerTestUser(agent, { email: 'tasks@example.com' });

    const tasks = await agent
      .get('/api/taskforge/v1/tasks')
      .set('Authorization', `Bearer ${registered.tokens.accessToken}`)
      .expect(200);

    expect(tasks.body).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  });

  it('allows access to tasks with a dev bypass client token when enabled', async () => {
    const registered = await registerTestUser(agent, { email: 'dev-bypass@example.com' });
    const devBypassToken = createDevBypassClientToken(
      { userId: registered.user.id, email: registered.user.email },
      devBypassClientSecret,
    );

    const tasks = await agent
      .get('/api/taskforge/v1/tasks')
      .set('x-taskforge-dev-bypass', devBypassToken)
      .expect(200);

    expect(tasks.body).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  });

  it('prefers the dev bypass token when a stale session cookie is present', async () => {
    const registered = await registerTestUser(agent, { email: 'dev-bypass-stale-cookie@example.com' });
    const devBypassToken = createDevBypassClientToken(
      { userId: registered.user.id, email: registered.user.email },
      devBypassClientSecret,
    );

    const tasks = await agent
      .get('/api/taskforge/v1/tasks')
      .set('Cookie', `${getSessionCookieName()}=stale-or-invalid-cookie`)
      .set('x-taskforge-dev-bypass', devBypassToken)
      .expect(200);

    expect(tasks.body).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  });

  it('rejects protected requests without a token', async () => {
    await agent.get('/api/taskforge/v1/auth/me').expect(401);
    await agent.get('/api/taskforge/v1/tasks').expect(401);
  });

  it('rejects protected requests with a malformed token', async () => {
    const registered = await registerTestUser(agent, { email: 'malformed@example.com' });
    const invalidToken = `${registered.tokens.accessToken}tampered`;

    await agent
      .get('/api/taskforge/v1/auth/me')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);
  });

  it('logs out the user and clears the session cookie', async () => {
    const registered = await registerTestUser(agent, { email: 'logout@example.com' });

    const logout = await agent
      .post('/api/taskforge/v1/auth/logout')
      .set('Authorization', `Bearer ${registered.tokens.accessToken}`)
      .expect(200);

    expect(logout.body).toEqual({ success: true });
    const cookieName = getSessionCookieName();
    expect(logout.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining(`${cookieName}=;`)]),
    );
  });

  it('issues a session cookie through the bridge when authorized', async () => {
    const registered = await registerTestUser(agent, { email: 'bridge@example.com' });

    const response = await bridgeSession({ userId: registered.user.id, email: registered.user.email });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ id: registered.user.id, email: registered.user.email }),
        tokens: expect.objectContaining({ accessToken: expect.any(String) }),
      }),
    );
    expect(extractSessionCookie(response.headers['set-cookie'])).toBeDefined();
  });

  it('rejects bridge attempts with an invalid secret', async () => {
    const registered = await registerTestUser(agent, { email: 'bridge-invalid@example.com' });

    const response = await agent
      .post('/api/taskforge/v1/auth/session-bridge')
      .set('x-session-bridge-secret', 'not-the-secret')
      .send({ userId: registered.user.id, email: registered.user.email });

    expect(response.status).toBe(401);
  });

  it('rejects bridge attempts for unknown users', async () => {
    const response = await bridgeSession({ userId: randomUUID(), email: 'ghost@example.com' });

    expect(response.status).toBe(404);
  });
});
