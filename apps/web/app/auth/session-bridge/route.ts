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

async function hasUsableApiSessionCookie(token: string): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl('v1/me'), {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      cache: 'no-store',
    });

    return response.ok;
  } catch (error) {
    console.error('[auth] Failed to validate existing API session cookie', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get('from');
  const fromPath = sanitizeReturnPath(fromParam);

  const existingCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (
    existingCookie?.value &&
    !isSessionTokenExpired(existingCookie.value) &&
    (await hasUsableApiSessionCookie(existingCookie.value))
  ) {
    return NextResponse.redirect(new URL(fromPath, request.nextUrl.origin));
  }

  const user = await getCurrentUser();

  if (!user) {
    const redirectUrl = new URL('/login', request.nextUrl.origin);
    redirectUrl.searchParams.set('from', fromPath);
    redirectUrl.searchParams.set('reason', 'session-bridge');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const accessToken = await getFreshBridgedAccessToken(user);
    const redirectUrl = new URL(fromPath, request.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl);
    const options = getSessionCookieOptions();
    response.cookies.set({ ...options, value: accessToken });
    return response;
  } catch (error) {
    console.error('[auth] Failed to ensure API session', error);
    const redirectUrl = new URL('/login', request.nextUrl.origin);
    redirectUrl.searchParams.set('from', fromPath);
    redirectUrl.searchParams.set('reason', 'session-bridge');
    return NextResponse.redirect(redirectUrl);
  }
}
