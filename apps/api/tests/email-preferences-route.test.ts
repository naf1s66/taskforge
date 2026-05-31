import type { SuperTest, Test } from 'supertest';

import { createTestAgent } from './utils/test-app';
import { registerTestUser } from './utils/auth';

describe('Email preferences API', () => {
  let agent: SuperTest<Test>;

  beforeEach(() => {
    agent = createTestAgent().agent;
  });

  it('returns default daily digest preferences with the current user', async () => {
    const registered = await registerTestUser(agent, { email: 'email-prefs-default@example.com' });

    const response = await agent
      .get('/api/taskforge/v1/me')
      .set('Authorization', `Bearer ${registered.tokens.accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({ id: registered.user.id }),
        emailPreference: {
          dailyDigestEnabled: false,
          dailyDigestTimezone: 'UTC',
        },
      }),
    );
  });

  it('updates and persists daily digest preference state', async () => {
    const registered = await registerTestUser(agent, { email: 'email-prefs-update@example.com' });

    const update = await agent
      .patch('/api/taskforge/v1/me/email-preferences')
      .set('Authorization', `Bearer ${registered.tokens.accessToken}`)
      .send({ dailyDigestEnabled: true })
      .expect(200);

    expect(update.body).toEqual({
      emailPreference: {
        dailyDigestEnabled: true,
        dailyDigestTimezone: 'UTC',
      },
    });

    const profile = await agent
      .get('/api/taskforge/v1/me')
      .set('Authorization', `Bearer ${registered.tokens.accessToken}`)
      .expect(200);

    expect(profile.body.emailPreference).toEqual({
      dailyDigestEnabled: true,
      dailyDigestTimezone: 'UTC',
    });
  });

  it('rejects non-boolean daily digest preference updates', async () => {
    const registered = await registerTestUser(agent, { email: 'email-prefs-invalid@example.com' });

    const response = await agent
      .patch('/api/taskforge/v1/me/email-preferences')
      .set('Authorization', `Bearer ${registered.tokens.accessToken}`)
      .send({ dailyDigestEnabled: 'true' })
      .expect(400);

    expect(response.body).toEqual(expect.objectContaining({ error: 'Invalid payload' }));
  });
});
