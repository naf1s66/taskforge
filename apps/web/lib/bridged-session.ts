import type { CurrentUserSource } from './server-auth';

function decodeJwtExpiration(token: string): number | undefined {
  const parts = token.split('.');
  if (parts.length < 2) {
    return undefined;
  }

  const payloadSegment = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const paddedPayload = payloadSegment.padEnd(Math.ceil(payloadSegment.length / 4) * 4, '=');

  try {
    const payload = JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf8'));
    if (typeof payload?.exp === 'number') {
      return payload.exp * 1000;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isSessionTokenExpired(token: string): boolean {
  const expiration = decodeJwtExpiration(token);
  if (!expiration) {
    return true;
  }

  return expiration <= Date.now();
}

export function shouldRedirectToSessionBridge(
  source: CurrentUserSource,
  sessionToken: string | undefined,
): boolean {
  if (source === 'dev-bypass') {
    return false;
  }

  return !sessionToken || isSessionTokenExpired(sessionToken);
}
