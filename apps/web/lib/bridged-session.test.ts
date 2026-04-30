import { describe, expect, it } from 'vitest';

import { shouldRedirectToSessionBridge } from './bridged-session';

function createJwtWithExpiration(expirationMs: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(expirationMs / 1000),
    }),
  ).toString('base64url');

  return `${header}.${payload}.signature`;
}

describe('shouldRedirectToSessionBridge', () => {
  it('redirects real authenticated users when the API cookie is missing', () => {
    expect(shouldRedirectToSessionBridge('nextauth', undefined)).toBe(true);
  });

  it('redirects real authenticated users when the API cookie is expired', () => {
    const expiredToken = createJwtWithExpiration(Date.now() - 60_000);
    expect(shouldRedirectToSessionBridge('nextauth', expiredToken)).toBe(true);
  });

  it('does not redirect when the user came from the dev bypass fallback', () => {
    expect(shouldRedirectToSessionBridge('dev-bypass', undefined)).toBe(false);
  });
});
