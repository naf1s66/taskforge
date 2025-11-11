import 'server-only';

import { cookies } from 'next/headers';

import { getApiUrl, SESSION_COOKIE_NAME } from './env';
import type { AuthenticatedUser } from './server-auth';

function resolveCookieDomain(): string | undefined {
  const explicit = process.env.COOKIE_DOMAIN;
  if (explicit) {
    return explicit;
  }

  if (process.env.NODE_ENV === 'production') {
    const apiUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiUrl) {
      try {
        const url = new URL(apiUrl);
        const hostname = url.hostname;
        const parts = hostname.split('.');
        if (parts.length >= 3) {
          return `.${parts.slice(-2).join('.')}`;
        }
        return `.${hostname}`;
      } catch {
        // ignore parse errors
      }
    }
  }

  return undefined;
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    domain: resolveCookieDomain(),
  } as const;
}

function getBridgeSecret() {
  const secret = process.env.SESSION_BRIDGE_SECRET;
  if (!secret) {
    throw new Error('SESSION_BRIDGE_SECRET is not configured');
  }
  return secret;
}

interface BridgeResponse {
  user: { id: string; email: string };
  tokens: { accessToken: string };
}

async function requestBridgeToken(user: AuthenticatedUser): Promise<string> {
  const secret = getBridgeSecret();
  const bridgeUrl = getApiUrl('v1/auth/session-bridge');
  const response = await fetch(bridgeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-session-bridge-secret': secret,
    },
    cache: 'no-store',
    body: JSON.stringify({ userId: user.id, email: user.email ?? undefined }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'unknown error');
    throw new Error(`Failed to bridge API session: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as BridgeResponse;

  if (!payload?.tokens?.accessToken) {
    throw new Error('Bridge response did not include an access token');
  }

  return payload.tokens.accessToken;
}

export function expireApiSessionCookie(): void {
  const cookieStore = cookies();
  const options = getSessionCookieOptions();
  cookieStore.set({ ...options, value: '', maxAge: 0 });
  cookieStore.set({ ...options, value: '', expires: new Date(0) });
}

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
    // ignore parse errors and treat the token as expired
  }

  return undefined;
}

export function isSessionTokenExpired(token: string): boolean {
  const expiration = decodeJwtExpiration(token);
  if (!expiration) {
    return true;
  }

  return expiration <= Date.now();
}

export async function getBridgedAccessToken(user: AuthenticatedUser): Promise<string> {
  const cookieStore = cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME);

  if (existing?.value && !isSessionTokenExpired(existing.value)) {
    return existing.value;
  }

  return requestBridgeToken(user);
}
