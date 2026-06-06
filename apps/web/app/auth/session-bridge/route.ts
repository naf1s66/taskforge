import { NextRequest, NextResponse } from 'next/server';

import { getApiUrl, SESSION_COOKIE_NAME } from '@/lib/env';
import {
  getFreshBridgedAccessToken,
  getSessionCookieOptions,
  isSessionTokenExpired,
} from '@/lib/session-bridge';
import { getCurrentUser } from '@/lib/server-auth';

function sanitizeReturnPath(value: string | null): string {
  if (!value) {
    return '/';
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }

  return trimmed;
}

function redirectNoStore(location: string): NextResponse {
  const response = new NextResponse(null, {
    status: 307,
    headers: {
      Location: location,
    },
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function createLoginLocation(fromPath: string): string {
  const searchParams = new URLSearchParams({
    from: fromPath,
    reason: 'session-bridge',
  });

  return `/login?${searchParams.toString()}`;
}

type ApiSessionCookieProbe = 'valid' | 'invalid' | 'unknown';

async function probeApiSessionCookie(token: string): Promise<ApiSessionCookieProbe> {
  try {
    const response = await fetch(getApiUrl('v1/me'), {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      return 'valid';
    }

    if (response.status === 401) {
      return 'invalid';
    }

    return 'unknown';
  } catch (error) {
    console.error('[auth] Failed to validate existing API session cookie', error);
    return 'unknown';
  }
}

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get('from');
  const fromPath = sanitizeReturnPath(fromParam);

  const existingCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const existingCookieProbe =
    existingCookie?.value && !isSessionTokenExpired(existingCookie.value)
      ? await probeApiSessionCookie(existingCookie.value)
      : 'invalid';

  if (
    existingCookie?.value &&
    !isSessionTokenExpired(existingCookie.value) &&
    existingCookieProbe !== 'invalid'
  ) {
    return redirectNoStore(fromPath);
  }

  const user = await getCurrentUser();

  if (!user) {
    return redirectNoStore(createLoginLocation(fromPath));
  }

  try {
    const accessToken = await getFreshBridgedAccessToken(user);
    const response = redirectNoStore(fromPath);
    const options = getSessionCookieOptions();
    response.cookies.set({ ...options, value: accessToken });
    return response;
  } catch (error) {
    console.error('[auth] Failed to ensure API session', error);
    return redirectNoStore(createLoginLocation(fromPath));
  }
}
