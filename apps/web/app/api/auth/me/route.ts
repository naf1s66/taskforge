import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getApiBaseUrl, SESSION_COOKIE_NAME } from '@/lib/env';

interface ApiMeResponse {
  user: { id: string; email: string | null; createdAt?: string } | null;
}

export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return NextResponse.json({ user: null } satisfies ApiMeResponse);
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/taskforge/v1/me`, {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      return NextResponse.json({ user: null } satisfies ApiMeResponse);
    }

    if (!response.ok) {
      const message = await response.text().catch(() => 'unknown error');
      console.error('[auth] Failed to fetch API session user', response.status, message);
      return NextResponse.json({ user: null } satisfies ApiMeResponse, { status: 500 });
    }

    const payload = (await response.json().catch(() => null)) as ApiMeResponse | null;

    if (!payload?.user) {
      return NextResponse.json({ user: null } satisfies ApiMeResponse);
    }

    return NextResponse.json(payload satisfies ApiMeResponse);
  } catch (error) {
    console.error('[auth] Error retrieving API session user', error);
    return NextResponse.json({ user: null } satisfies ApiMeResponse, { status: 500 });
  }
}
