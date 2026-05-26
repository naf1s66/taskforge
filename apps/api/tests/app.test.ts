import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { createTokenService } from '../src/auth/token';
import { InMemoryUserStore, type UserStore } from '../src/auth/user-store';
import { createApp } from '../src/app';

describe('createApp', () => {
  const originalDigestJobSecret = process.env.DIGEST_JOB_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTrustProxy = process.env.TRUST_PROXY;

  afterEach(() => {
    if (originalDigestJobSecret === undefined) {
      delete process.env.DIGEST_JOB_SECRET;
    } else {
      process.env.DIGEST_JOB_SECRET = originalDigestJobSecret;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalTrustProxy === undefined) {
      delete process.env.TRUST_PROXY;
    } else {
      process.env.TRUST_PROXY = originalTrustProxy;
    }
  });

  it('fails fast when digest jobs are enabled without an email adapter', () => {
    expect(() =>
      createApp({
        jwtSecret: 'test-secret',
        digestJobSecret: 'job-secret',
      }),
    ).toThrow('digestEmailAdapter or welcomeEmailAdapter must be configured before enabling digest jobs.');
  });

  it('does not enable digest jobs from the environment without an email adapter', () => {
    process.env.DIGEST_JOB_SECRET = 'job-secret';

    expect(() => createApp({ jwtSecret: 'test-secret' })).toThrow(
      'digestEmailAdapter or welcomeEmailAdapter must be configured before enabling digest jobs.',
    );
  });

  it('does not infer trusted proxies solely from production NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DIGEST_JOB_SECRET;
    delete process.env.TRUST_PROXY;

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    expect(app.get('trust proxy')).toBe(false);
  });

  it('uses TRUST_PROXY when deriving client IPs behind a configured proxy chain', () => {
    process.env.NODE_ENV = 'production';
    process.env.TRUST_PROXY = '1';
    delete process.env.DIGEST_JOB_SECRET;

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    expect(app.get('trust proxy')).toBe(1);
  });

  it('mounts digest preview without configured email delivery', async () => {
    delete process.env.DIGEST_JOB_SECRET;

    const userStore = new InMemoryUserStore();
    const user = {
      id: randomUUID(),
      email: 'preview@example.test',
      passwordHash: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    };
    await userStore.create(user);

    const app = createApp({ jwtSecret: 'test-secret', userStore });
    const tokens = await createTokenService({ accessSecret: 'test-secret' }).issueTokens(user.id);

    const response = await request(app)
      .get('/api/taskforge/v1/email/digest/preview')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ timezone: 'UTC', groups: expect.any(Array) });
  });
});

function createPersistentUserStoreStub(): UserStore {
  return {
    create: async () => undefined,
    findByEmail: async () => undefined,
    findById: async () => undefined,
    clear: async () => undefined,
  };
}
