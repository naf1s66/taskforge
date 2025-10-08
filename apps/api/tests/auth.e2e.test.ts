import request from 'supertest';

import { InMemoryUserStore } from '../src/auth/user-store';
import { createApp } from '../src/app';

describe('Auth API', () => {
  const createTestAgent = () => {
    const app = createApp({ jwtSecret: 'test-secret', userStore: new InMemoryUserStore() });
    return request(app);
  };

  it('registers a user and returns a token', async () => {
    const agent = createTestAgent();

    const response = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'new-user@example.com', password: 'Secret123!' })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email: 'new-user@example.com' }),
        token: expect.any(String),
      }),
    );
  });

  it('prevents duplicate registrations', async () => {
    const agent = createTestAgent();

    await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'dupe@example.com', password: 'Secret123!' })
      .expect(201);

    const duplicate = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'dupe@example.com', password: 'Secret123!' })
      .expect(409);

    expect(duplicate.body).toEqual(expect.objectContaining({ error: 'User already exists' }));
  });

  it('logs in an existing user and returns a new token', async () => {
    const agent = createTestAgent();

    await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'login@example.com', password: 'Secret123!' })
      .expect(201);

    const login = await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email: 'login@example.com', password: 'Secret123!' })
      .expect(200);

    expect(login.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email: 'login@example.com' }),
        token: expect.any(String),
      }),
    );
  });

  it('rejects invalid login attempts', async () => {
    const agent = createTestAgent();

    await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'invalid@example.com', password: 'Secret123!' })
      .expect(201);

    await agent
      .post('/api/taskforge/v1/auth/login')
      .send({ email: 'invalid@example.com', password: 'WrongPassword1' })
      .expect(401);
  });

  it('returns the authenticated user for /auth/me', async () => {
    const agent = createTestAgent();

    const { body } = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email: 'profile@example.com', password: 'Secret123!' })
      .expect(201);

    const profile = await agent
      .get('/api/taskforge/v1/auth/me')
      .set('Authorization', `Bearer ${body.token}`)
      .expect(200);

    expect(profile.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ email: 'profile@example.com' }),
      }),
    );
  });

  it('rejects protected requests without a token', async () => {
    const agent = createTestAgent();

    await agent.get('/api/taskforge/v1/auth/me').expect(401);

    await agent.get('/api/taskforge/v1/tasks').expect(401);
  });
});
