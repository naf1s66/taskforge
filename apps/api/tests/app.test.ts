import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { createTokenService } from '../src/auth/token';
import { InMemoryUserStore, type UserStore } from '../src/auth/user-store';
import { createApp } from '../src/app';

describe('createApp', () => {
  const originalDigestJobSecret = process.env.DIGEST_JOB_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTrustProxy = process.env.TRUST_PROXY;
  const originalCorsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;

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

    if (originalCorsAllowedOrigins === undefined) {
      delete process.env.CORS_ALLOWED_ORIGINS;
    } else {
      process.env.CORS_ALLOWED_ORIGINS = originalCorsAllowedOrigins;
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

  it('allows local configured browser origins and credentialed requests by default', async () => {
    delete process.env.DIGEST_JOB_SECRET;
    delete process.env.CORS_ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'test';

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    const response = await request(app)
      .get('/api/taskforge/v1/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('returns structured JSON for unmatched routes', async () => {
    delete process.env.DIGEST_JOB_SECRET;

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    await request(app)
      .get('/api/taskforge/v1/missing')
      .expect('content-type', /json/)
      .expect(404, { error: 'Not found' });
  });

  it('preserves no-origin local health and curl-style requests', async () => {
    delete process.env.DIGEST_JOB_SECRET;
    delete process.env.CORS_ALLOWED_ORIGINS;

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    await request(app)
      .get('/api/taskforge/v1/health')
      .expect(200, { ok: true });
  });

  it('rejects unlisted, malformed, and pathful browser origins with JSON errors', async () => {
    delete process.env.DIGEST_JOB_SECRET;
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    const deniedResponse = await request(app)
      .get('/api/taskforge/v1/health')
      .set('Origin', 'https://evil.example.com')
      .expect('content-type', /json/)
      .expect(403, { error: 'CORS origin denied' });
    expect(deniedResponse.headers['x-content-type-options']).toBe('nosniff');

    await request(app)
      .get('/api/taskforge/v1/health')
      .set('Origin', 'not-a-url')
      .expect('content-type', /json/)
      .expect(403, { error: 'CORS origin denied' });

    await request(app)
      .get('/api/taskforge/v1/health')
      .set('Origin', 'https://app.example.com/dashboard')
      .expect('content-type', /json/)
      .expect(403, { error: 'CORS origin denied' });
  });

  it('returns structured production JSON for async route errors', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DIGEST_JOB_SECRET;

    const app = createApp({
      jwtSecret: 'test-secret',
      userStore: createFailingUserStoreStub(),
    });

    await request(app)
      .post('/api/taskforge/v1/auth/login')
      .send({ email: 'failure@example.com', password: 'Password123!' })
      .expect('content-type', /json/)
      .expect(500, { error: 'Internal server error' });
  });

  it('requires explicit configured CORS origins in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DIGEST_JOB_SECRET;
    delete process.env.CORS_ALLOWED_ORIGINS;

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    await request(app)
      .get('/api/taskforge/v1/health')
      .set('Origin', 'https://taskforge.app')
      .expect(403, { error: 'CORS origin denied' });
  });

  it('allows explicitly configured production CORS origins', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DIGEST_JOB_SECRET;
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    const response = await request(app)
      .options('/api/taskforge/v1/health')
      .set('Origin', 'https://admin.example.com')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('https://admin.example.com');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('uses trusted proxy hop counts for global rate-limit client IP keys', async () => {
    delete process.env.DIGEST_JOB_SECRET;
    process.env.TRUST_PROXY = '1';

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    for (let index = 0; index < 120; index += 1) {
      await request(app)
        .get('/api/taskforge/v1/health')
        .set('X-Forwarded-For', '198.51.100.1')
        .expect(200);
    }

    await request(app)
      .get('/api/taskforge/v1/health')
      .set('X-Forwarded-For', '203.0.113.9')
      .expect(200);
  });

  it('ignores forwarded client IPs when TRUST_PROXY is false for rate limits', async () => {
    delete process.env.DIGEST_JOB_SECRET;
    process.env.TRUST_PROXY = 'false';

    const app = createApp({ jwtSecret: 'test-secret', userStore: createPersistentUserStoreStub() });

    for (let index = 0; index < 120; index += 1) {
      await request(app)
        .get('/api/taskforge/v1/health')
        .set('X-Forwarded-For', '198.51.100.1')
        .expect(200);
    }

    await request(app)
      .get('/api/taskforge/v1/health')
      .set('X-Forwarded-For', '203.0.113.9')
      .expect(429, { error: 'Too many requests, please try again later.' });
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

function createFailingUserStoreStub(): UserStore {
  return {
    create: async () => {
      throw new Error('Database connection string leaked in error');
    },
    findByEmail: async () => {
      throw new Error('Database connection string leaked in error');
    },
    findById: async () => {
      throw new Error('Database connection string leaked in error');
    },
    clear: async () => undefined,
  };
}
