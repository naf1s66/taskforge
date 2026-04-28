import 'server-only';

import { createHmac } from 'node:crypto';

import type { AuthenticatedUser } from './server-auth';

const DEV_BYPASS_TOKEN_AUDIENCE = 'taskforge-dev-bypass';
const DEV_BYPASS_TOKEN_TTL_SECONDS = 15 * 60;

interface DevBypassTokenPayload {
  sub: string;
  email: string | null;
  aud: typeof DEV_BYPASS_TOKEN_AUDIENCE;
  iat: number;
  exp: number;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signPayload(payloadSegment: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadSegment).digest('base64url');
}

export function createDevBypassClientToken(
  user: AuthenticatedUser,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const secret = env.TF_DEV_BYPASS_CLIENT_SECRET;

  if (!secret) {
    console.error('[auth] TF_DEV_BYPASS_CLIENT_SECRET is not configured for dev bypass client auth.');
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: DevBypassTokenPayload = {
    sub: user.id,
    email: user.email ?? null,
    aud: DEV_BYPASS_TOKEN_AUDIENCE,
    iat: now,
    exp: now + DEV_BYPASS_TOKEN_TTL_SECONDS,
  };

  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadSegment, secret);

  return `${payloadSegment}.${signature}`;
}
