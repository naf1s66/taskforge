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
});
