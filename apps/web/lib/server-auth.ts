import 'server-only';

import type { Session } from 'next-auth';
import { cookies } from 'next/headers';

import { auth } from './auth';
import { getApiBaseUrl, SESSION_COOKIE_NAME } from './env';

export type AuthenticatedUser = NonNullable<Session['user']>;

async function getApiUserFromCookie(): Promise<AuthenticatedUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/taskforge/v1/me`, {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as
      | { user?: { id: string; email?: string | null; name?: string | null } | null }
      | null;

    const apiUser = payload?.user;
    if (!apiUser?.id) {
      return null;
    }

    return {
      id: apiUser.id,
      email: apiUser.email ?? null,
      name: apiUser.name ?? apiUser.email ?? null,
      image: null,
    } satisfies AuthenticatedUser;
  } catch (error) {
    console.error('[auth] Failed to resolve API user from cookie', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (session?.user) {
    return session.user as AuthenticatedUser;
  }

  return getApiUserFromCookie();
}
