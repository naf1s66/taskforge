import 'server-only';

import { cookies } from 'next/headers';

import { getApiBaseUrl, SESSION_COOKIE_NAME } from './env';
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
  const bridgeUrl = new URL('auth/session-bridge', `${getApiBaseUrl()}/`).toString();
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

export async function getBridgedAccessToken(user: AuthenticatedUser): Promise<string> {
  const cookieStore = cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME);

  if (existing?.value) {
    return existing.value;
  }

  return requestBridgeToken(user);
}
