import 'server-only';

import { cookies } from 'next/headers';

import { getApiBaseUrl, SESSION_COOKIE_NAME } from './env';

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { user?: AuthUser };
    return data.user ?? null;
  } catch (error) {
    console.error('[auth] Failed to load user in server context', error);
    return null;
  }
}
