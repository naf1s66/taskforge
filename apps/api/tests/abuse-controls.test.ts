import { randomUUID } from 'node:crypto';

import express from 'express';
import request from 'supertest';

import { createApp } from '../src/app';
import { createAuthAttemptLimiter, isDevBypassEnabled } from '../src/routes/auth';
import { createTestAgent } from './utils/test-app';
import { registerTestUser } from './utils/auth';

function createLimitedProbeApp(trustProxy?: boolean | number) {
  const app = express();
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  }
  app.post(
    '/limited',
    createAuthAttemptLimiter({ max: 1, windowMs: 60_000, skipInTest: false }),
    (_req, res) => res.status(400).json({ error: 'probe' }),
  );
  return app;
}

describe('abuse controls', () => {
  const originalJsonBodyLimit = process.env.API_JSON_BODY_LIMIT;
  const originalTrustProxy = process.env.TRUST_PROXY;

  afterEach(() => {
    if (originalJsonBodyLimit === undefined) {
      delete process.env.API_JSON_BODY_LIMIT;
    } else {
      process.env.API_JSON_BODY_LIMIT = originalJsonBodyLimit;
    }

    if (originalTrustProxy === undefined) {
      delete process.env.TRUST_PROXY;
    } else {
      process.env.TRUST_PROXY = originalTrustProxy;
    }
  });

  it('returns consistent 429 responses and rate limit headers for auth attempts', async () => {
    const { agent } = createTestAgent({ authRateLimit: { max: 2, windowMs: 60_000, skipInTest: false } });

    await agent.post('/api/taskforge/v1/auth/login').send({ email: 'nobody@example.com', password: 'Password123!' }).expect(401);
    await agent.post('/api/taskforge/v1/auth/login').send({ email: 'nobody@example.com', password: 'Password123!' }).expect(401);

    const limited = await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123!' })
      .expect(429);

    expect(limited.body).toEqual({ error: 'Too many authentication attempts. Please try again later.' });
    expect(limited.headers['ratelimit-limit']).toBe('2');
  });

  it('keeps the server-side session bridge on a separate auth limiter bucket', async () => {
    const sessionBridgeSecret = 'test-bridge-secret';
    const { agent, userStore } = createTestAgent({
      sessionBridgeSecret,
      authRateLimit: { max: 1, windowMs: 60_000, skipInTest: false },
      sessionBridgeRateLimit: { max: 2, windowMs: 60_000, skipInTest: false },
    });
    const user = {
      id: randomUUID(),
      email: 'bridge-bucket@example.com',
      passwordHash: null,
      createdAt: new Date(),
    };
    await userStore.create(user);

    await agent.post('/api/taskforge/v1/auth/login').send({ email: 'nobody@example.com', password: 'Password123!' }).expect(401);
    await agent.post('/api/taskforge/v1/auth/login').send({ email: 'nobody@example.com', password: 'Password123!' }).expect(429);

    const bridgePayload = { userId: user.id, email: user.email };
    await agent
      .post('/api/taskforge/v1/auth/session-bridge')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send(bridgePayload)
      .expect(200);
    await agent
      .post('/api/taskforge/v1/auth/session-bridge')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send(bridgePayload)
      .expect(200);
    const limited = await agent
      .post('/api/taskforge/v1/auth/session-bridge')
      .set('x-session-bridge-secret', sessionBridgeSecret)
      .send(bridgePayload)
      .expect(429);

    expect(limited.body).toEqual({ error: 'Too many authentication attempts. Please try again later.' });
    expect(limited.headers['ratelimit-limit']).toBe('2');
  });

  it('does not let untrusted X-Forwarded-For values create new rate-limit buckets when trust proxy is disabled', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = createLimitedProbeApp(false);

    await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.10').expect(400);
    const response = await request(app)
      .post('/limited')
      .set('X-Forwarded-For', '203.0.113.11')
      .expect(429);

    expect(response.body).toEqual({ error: 'Too many authentication attempts. Please try again later.' });
    consoleError.mockRestore();
  });

  it('uses forwarded client addresses only when a trusted proxy is configured', async () => {
    const app = createLimitedProbeApp(1);

    await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.20').expect(400);
    await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.21').expect(400);
    await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.20').expect(429);
  });

  it('enforces the explicit JSON body size limit configured for the API app', async () => {
    process.env.API_JSON_BODY_LIMIT = '1kb';
    const app = createApp({ jwtSecret: 'test-secret', authRateLimit: false });

    const response = await request(app)
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'large-body@example.com', password: 'Password123!', filler: 'x'.repeat(2_000) })
      .expect(413);

    expect(response.body.error).toEqual(expect.stringContaining('too large'));
  });

  it('keeps the dev auth bypass disabled in production even when the flag is true', () => {
    expect(isDevBypassEnabled({ NODE_ENV: 'production', TF_DEV_BYPASS_AUTH: 'true' })).toBe(false);
    expect(isDevBypassEnabled({ NODE_ENV: 'development', TF_DEV_BYPASS_AUTH: 'true' })).toBe(true);
  });

  it('rejects oversized task and tag inputs, unknown fields, and unbounded parameters', async () => {
    const { agent } = createTestAgent();
    const auth = await registerTestUser(agent, { email: 'abuse-inputs@example.com' });
    const bearer = `Bearer ${auth.tokens.accessToken}`;

    await agent
      .post('/api/taskforge/v1/tasks')
      .set('Authorization', bearer)
      .send({ title: 'x'.repeat(161) })
      .expect(400);
    await agent
      .post('/api/taskforge/v1/tasks')
      .set('Authorization', bearer)
      .send({ title: 'Valid', description: 'x'.repeat(5_001) })
      .expect(400);
    await agent
      .post('/api/taskforge/v1/tasks')
      .set('Authorization', bearer)
      .send({ title: 'Valid', tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`) })
      .expect(400);
    await agent
      .post('/api/taskforge/v1/tasks')
      .set('Authorization', bearer)
      .send({ title: 'Valid', unexpected: true })
      .expect(400);
    await agent
      .get(`/api/taskforge/v1/tasks?pageSize=101&q=${'x'.repeat(201)}`)
      .set('Authorization', bearer)
      .expect(400);
    await agent
      .patch('/api/taskforge/v1/tasks/board/move')
      .set('Authorization', bearer)
      .send({
        taskId: '9e22c508-1383-4609-9bbd-2e09b7a2d108',
        targetStatus: 'DONE',
        targetIndex: 1_001,
      })
      .expect(400);
    await agent
      .post('/api/taskforge/v1/tags')
      .set('Authorization', bearer)
      .send({ label: 'x'.repeat(65) })
      .expect(400);
  });

  it('rejects unknown email preference fields', async () => {
    const { agent } = createTestAgent();
    const auth = await registerTestUser(agent, { email: 'abuse-prefs@example.com' });

    await agent
      .patch('/api/taskforge/v1/me/email-preferences')
      .set('Authorization', `Bearer ${auth.tokens.accessToken}`)
      .send({ dailyDigestEnabled: true, unknown: 'field' })
      .expect(400);
  });
});
