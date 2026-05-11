import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getApiUrl, SESSION_COOKIE_NAME } from '@/lib/env';
import { createDevBypassClientToken } from '@/lib/dev-bypass-client-token';
import { isDevAuthBypassEnabled } from '@/lib/dev-auth-bypass';
import { getCurrentUser } from '@/lib/server-auth';
import {
  getBridgedAccessToken,
  getFreshBridgedAccessToken,
  getSessionCookieOptions,
} from '@/lib/session-bridge';

interface ApiMeResponse {
  user: { id: string; email: string | null; createdAt?: string } | null;
  clientAuth?: { strategy: 'dev-bypass'; token: string } | null;
}

type SessionLookupResult =
  | { kind: 'success'; payload: ApiMeResponse }
  | { kind: 'missing'; hadCookie: boolean }
  | { kind: 'error' };

async function readApiSessionUser(): Promise<SessionLookupResult> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return { kind: 'missing', hadCookie: false };
  }

  try {
    const response = await fetch(getApiUrl('v1/me'), {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      return { kind: 'missing', hadCookie: true };
    }

    if (!response.ok) {
      const message = await response.text().catch(() => 'unknown error');
      console.error('[auth] Failed to fetch API session user', response.status, message);
      return { kind: 'error' };
    }

    const payload = (await response.json().catch(() => null)) as ApiMeResponse | null;

    if (!payload?.user) {
      return { kind: 'missing', hadCookie: true };
    }

    return { kind: 'success', payload: payload satisfies ApiMeResponse };
  } catch (error) {
    console.error('[auth] Error retrieving API session user', error);
    return { kind: 'error' };
  }
}

export async function GET() {
  const devBypassEnabled = isDevAuthBypassEnabled();
  const bypassUser = devBypassEnabled ? await getCurrentUser() : null;
  const sessionLookup = await readApiSessionUser();
  let sessionUserMismatch = false;
  const rejectedSessionCookie = sessionLookup.kind === 'missing' && sessionLookup.hadCookie;

  if (sessionLookup.kind === 'success') {
    if (bypassUser && sessionLookup.payload.user?.id !== bypassUser.id) {
      sessionUserMismatch = true;
      console.warn('[auth] Ignoring cookie session that does not match the active dev bypass user.');
    } else {
      return NextResponse.json(sessionLookup.payload satisfies ApiMeResponse);
    }
  }

  if (devBypassEnabled && bypassUser) {
    try {
      const accessToken = sessionUserMismatch || rejectedSessionCookie
        ? await getFreshBridgedAccessToken(bypassUser)
        : await getBridgedAccessToken(bypassUser);
      const response = NextResponse.json({
        user: {
          id: bypassUser.id,
          email: bypassUser.email ?? null,
        },
      } satisfies ApiMeResponse);
      response.cookies.set({ ...getSessionCookieOptions(), value: accessToken });
      return response;
    } catch (error) {
      console.error('[auth] Failed to bridge dev bypass session', error);
    }
  }

  if (sessionLookup.kind === 'error') {
    return NextResponse.json({ user: null } satisfies ApiMeResponse, { status: 500 });
  }

  if (bypassUser) {
    const devBypassToken = createDevBypassClientToken(bypassUser);
    if (devBypassToken) {
      const response = NextResponse.json({
        user: {
          id: bypassUser.id,
          email: bypassUser.email ?? null,
        },
        clientAuth: {
          strategy: 'dev-bypass',
          token: devBypassToken,
        },
      } satisfies ApiMeResponse);
      if (rejectedSessionCookie) {
        response.cookies.set({
          ...getSessionCookieOptions(),
          value: '',
          maxAge: 0,
          expires: new Date(0),
        });
      }
      return response;
    }
  }

  return NextResponse.json({ user: null } satisfies ApiMeResponse);
}
