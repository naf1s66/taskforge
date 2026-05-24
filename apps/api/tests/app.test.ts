import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { createTokenService } from '../src/auth/token';
import { InMemoryUserStore } from '../src/auth/user-store';
import { createApp } from '../src/app';

describe('createApp', () => {
  const originalDigestJobSecret = process.env.DIGEST_JOB_SECRET;

  afterEach(() => {
    if (originalDigestJobSecret === undefined) {
      delete process.env.DIGEST_JOB_SECRET;
    } else {
      process.env.DIGEST_JOB_SECRET = originalDigestJobSecret;
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
