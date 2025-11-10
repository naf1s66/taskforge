import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl, SESSION_COOKIE_NAME } from '@/lib/env';
import { expireApiSessionCookie, getSessionCookieOptions } from '@/lib/session-bridge';

function isSameOrigin(request: NextRequest): boolean {
  const expected = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const origin = request.headers.get('origin');
  if (origin) {
    return origin === expected;
  }

  const referer = request.headers.get('referer');
  if (!referer) {
    return false;
  }

  try {
    const refererUrl = new URL(referer);
    return `${refererUrl.protocol}//${refererUrl.host}` === expected;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const cookieHeader = request.headers.get('cookie');
  let apiStatus: number | null = null;

  if (cookieHeader?.includes(`${SESSION_COOKIE_NAME}=`)) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/taskforge/v1/auth/logout`, {
        method: 'POST',
        headers: {
          cookie: cookieHeader,
        },
        cache: 'no-store',
      });
      apiStatus = response.status;
    } catch (error) {
      console.error('[auth] API logout call failed', error);
    }
  }

  const result = NextResponse.json({ success: true, apiStatus: apiStatus ?? undefined });
  const options = getSessionCookieOptions();
  result.cookies.set({ ...options, value: '', maxAge: 0 });
  result.cookies.set({ ...options, value: '', expires: new Date(0) });
  expireApiSessionCookie();

  return result;
}
