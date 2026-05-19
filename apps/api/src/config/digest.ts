const SECRET_PLACEHOLDER_VALUES = ['changeme', 'change-me', 'example', 'placeholder', '<random_digest_job_secret>'];

export interface DigestJobConfig {
  dailySendLimit: number;
  secret?: string;
}

const isLocalEnv = (env: NodeJS.ProcessEnv) => env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

function containsPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return SECRET_PLACEHOLDER_VALUES.some(placeholder => normalized.includes(placeholder));
}

export function parseDailySendLimit(rawLimit: string | undefined, fallback = 100): number {
  const value = rawLimit?.trim();
  if (!value) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`EMAIL_DAILY_SEND_LIMIT must be a non-negative integer. Received: ${rawLimit}`);
  }

  const limit = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(limit)) {
    throw new Error(`EMAIL_DAILY_SEND_LIMIT is too large. Received: ${rawLimit}`);
  }

  return limit;
}

export function getDigestJobConfig(env: NodeJS.ProcessEnv = process.env): DigestJobConfig {
  const dailySendLimit = parseDailySendLimit(env.EMAIL_DAILY_SEND_LIMIT, 100);
  const secret = env.DIGEST_JOB_SECRET?.trim();

  if (!isLocalEnv(env)) {
    if (!secret) {
      throw new Error('DIGEST_JOB_SECRET must be set before enabling the production digest job endpoint.');
    }

    if (containsPlaceholder(secret)) {
      throw new Error('DIGEST_JOB_SECRET appears to be a placeholder. Set it to a strong random value.');
    }
  }

  return {
    dailySendLimit,
    secret: secret || undefined,
  };
}
