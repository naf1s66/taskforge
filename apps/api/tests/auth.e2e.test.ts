import { randomUUID } from 'node:crypto';

import type { SuperTest, Test } from 'supertest';

import { getSessionCookieName } from '@taskforge/shared';

import { createTestAgent } from './utils/test-app';
import { loginTestUser, registerTestUser, extractSessionCookie } from './utils/auth';

describe('Auth API', () => {
  let agent: SuperTest<Test>;
  const sessionBridgeSecret = 'test-bridge-secret';

  beforeEach(() => {
    const context = createTestAgent({ sessionBridgeSecret });
    agent = context.agent;
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

  it('rejects invalid registration payloads', async () => {
    const invalid = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(invalid.body).toEqual(expect.objectContaining({ error: 'Invalid payload' }));
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
