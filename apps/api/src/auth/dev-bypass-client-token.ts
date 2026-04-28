import { createHmac, timingSafeEqual } from 'node:crypto';

const DEV_BYPASS_TOKEN_AUDIENCE = 'taskforge-dev-bypass';
const DEV_BYPASS_TOKEN_TTL_SECONDS = 15 * 60;

interface DevBypassTokenPayload {
  sub: string;
  email: string | null;
  aud: typeof DEV_BYPASS_TOKEN_AUDIENCE;
  iat: number;
  exp: number;
}

export interface DevBypassClientTokenClaims {
  userId: string;
  email: string | null;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payloadSegment: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadSegment).digest('base64url');
}

function parsePayload(token: string): { payload: DevBypassTokenPayload; payloadSegment: string; signature: string } {
  const [payloadSegment, signature] = token.split('.');

  if (!payloadSegment || !signature || token.split('.').length !== 2) {
    throw new Error('Malformed dev bypass token');
  }

  const payload = JSON.parse(decodeBase64Url(payloadSegment)) as DevBypassTokenPayload;

  return { payload, payloadSegment, signature };
}

export function createDevBypassClientToken(
  claims: DevBypassClientTokenClaims,
  secret: string,
  now = Date.now(),
): string {
  const issuedAt = Math.floor(now / 1000);
  const payload: DevBypassTokenPayload = {
    sub: claims.userId,
    email: claims.email,
    aud: DEV_BYPASS_TOKEN_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + DEV_BYPASS_TOKEN_TTL_SECONDS,
  };

  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadSegment, secret);

  return `${payloadSegment}.${signature}`;
}

export function verifyDevBypassClientToken(
  token: string,
  secret: string,
  now = Date.now(),
): DevBypassClientTokenClaims {
  const { payload, payloadSegment, signature } = parsePayload(token);
  const expectedSignature = signPayload(payloadSegment, secret);

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid dev bypass token signature');
  }

  if (payload.aud !== DEV_BYPASS_TOKEN_AUDIENCE) {
    throw new Error('Invalid dev bypass token audience');
  }

  const nowInSeconds = Math.floor(now / 1000);
  if (payload.exp <= nowInSeconds) {
    throw new Error('Expired dev bypass token');
  }

  if (payload.iat > nowInSeconds + 30) {
    throw new Error('Invalid dev bypass token issued-at timestamp');
  }

  return {
    userId: payload.sub,
    email: payload.email ?? null,
  };
}
