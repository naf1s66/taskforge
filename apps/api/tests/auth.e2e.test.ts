import { randomUUID } from 'node:crypto';

import type { SuperTest, Test } from 'supertest';

import { InMemoryUserStore } from '../src/auth/user-store';
import { createTestAgent } from './utils/test-app';

const defaultPassword = 'Secret123!';

function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

describe('Auth API', () => {
  let agent: SuperTest<Test>;
  let userStore: InMemoryUserStore;

  beforeEach(() => {
    const context = createTestAgent();
    agent = context.agent;
    userStore = context.userStore;
  });

  afterEach(async () => {
    await userStore.clear();
  });

  const register = async (email = uniqueEmail('user'), password = defaultPassword) =>
    agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email, password })
      .expect(201);

  it('registers a user, returns tokens, and issues a session cookie', async () => {
    const response = await register();

    expect(response.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email: expect.stringContaining('@example.com') }),
        tokens: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenType: 'Bearer',
          accessTokenExpiresAt: expect.any(String),
          refreshTokenExpiresAt: expect.any(String),
        }),
      }),
    );
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('tf_session=')]),
    );
  });

  it('rejects invalid registration payloads', async () => {
    const invalid = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(invalid.body).toEqual(
      expect.objectContaining({ error: 'Invalid payload' }),
    );
  });

  it('prevents duplicate registrations', async () => {
    const email = uniqueEmail('dupe');
    await register(email);

    const duplicate = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email, password: defaultPassword })
      .expect(409);

    expect(duplicate.body).toEqual(expect.objectContaining({ error: 'User already exists' }));
  });

  it('logs in an existing user and returns a new token set', async () => {
    const email = uniqueEmail('login');
    await register(email);

    const login = await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email, password: defaultPassword })
      .expect(200);

    expect(login.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email }),
        tokens: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenType: 'Bearer',
        }),
      }),
    );
  });

  it('rejects login attempts for unknown users', async () => {
    await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email: uniqueEmail('missing'), password: defaultPassword })
      .expect(401);
  });

  it('rejects invalid login attempts', async () => {
    const email = uniqueEmail('invalid');
    await register(email);

    await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email, password: 'WrongPassword1' })
      .expect(401);
  });

  it('returns the authenticated user for /auth/me', async () => {
    const email = uniqueEmail('profile');
    const { body } = await register(email);

    const profile = await agent
      .get('/api/taskforge/v1/auth/me')
      .set('Authorization', `Bearer ${body.tokens.accessToken}`)
      .expect(200);

    expect(profile.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email }),
      }),
    );
  });

  it('allows access to tasks when authenticated', async () => {
    const { body } = await register();

    const tasks = await agent
      .get('/api/taskforge/v1/tasks')
      .set('Authorization', `Bearer ${body.tokens.accessToken}`)
      .expect(200);

    expect(tasks.body).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  });

  it('rejects protected requests without a token', async () => {
    await agent.get('/api/taskforge/v1/auth/me').expect(401);
    await agent.get('/api/taskforge/v1/tasks').expect(401);
  });

  it('rejects protected requests with a malformed token', async () => {
    const { body } = await register();
    const invalidToken = `${body.tokens.accessToken}tampered`;

    await agent
      .get('/api/taskforge/v1/auth/me')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);
  });

  it('logs out the user and clears the session cookie', async () => {
    const { body } = await register();

    const logout = await agent
      .post('/api/taskforge/v1/auth/logout')
      .set('Authorization', `Bearer ${body.tokens.accessToken}`)
      .expect(200);

    expect(logout.body).toEqual({ success: true });
    expect(logout.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('tf_session=;')]),
    );
  });
});
