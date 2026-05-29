import { getDigestJobConfig, parseDailySendLimit } from '../src/config/digest';

describe('digest job config', () => {
  it('uses the conservative default daily send limit', () => {
    expect(parseDailySendLimit(undefined)).toBe(90);
    expect(getDigestJobConfig({ NODE_ENV: 'test' }).dailySendLimit).toBe(90);
  });

  it('parses explicit non-negative daily send limits', () => {
    expect(parseDailySendLimit('0')).toBe(0);
    expect(parseDailySendLimit(' 42 ')).toBe(42);
    expect(getDigestJobConfig({ NODE_ENV: 'test', EMAIL_DAILY_SEND_LIMIT: '12' })).toEqual({
      dailySendLimit: 12,
      secret: undefined,
    });
  });

  it('rejects malformed or unsafe daily send limits', () => {
    expect(() => parseDailySendLimit('-1')).toThrow('EMAIL_DAILY_SEND_LIMIT must be a non-negative integer');
    expect(() => parseDailySendLimit('1.5')).toThrow('EMAIL_DAILY_SEND_LIMIT must be a non-negative integer');
    expect(() => parseDailySendLimit('9007199254740992')).toThrow('EMAIL_DAILY_SEND_LIMIT is too large');
  });

  it('requires a digest job secret outside local environments', () => {
    expect(() => getDigestJobConfig({ NODE_ENV: 'production' })).toThrow(
      'DIGEST_JOB_SECRET must be set before enabling the production digest job endpoint.',
    );
  });

  it('rejects placeholder digest job secrets outside local environments', () => {
    expect(() =>
      getDigestJobConfig({
        NODE_ENV: 'production',
        DIGEST_JOB_SECRET: '<RANDOM_DIGEST_JOB_SECRET>',
      }),
    ).toThrow('DIGEST_JOB_SECRET appears to be a placeholder');
  });

  it('returns trimmed production digest job secrets', () => {
    expect(
      getDigestJobConfig({
        NODE_ENV: 'production',
        DIGEST_JOB_SECRET: '  real-digest-job-secret  ',
        EMAIL_DAILY_SEND_LIMIT: '90',
      }),
    ).toEqual({
      dailySendLimit: 90,
      secret: 'real-digest-job-secret',
    });
  });

  it('keeps digest job secrets optional in local environments', () => {
    expect(getDigestJobConfig({ NODE_ENV: 'development' })).toEqual({
      dailySendLimit: 90,
      secret: undefined,
    });
  });
});
