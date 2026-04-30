import 'server-only';

import type { Session } from 'next-auth';
import { cookies } from 'next/headers';

import { auth } from './auth';
import { getApiUrl, SESSION_COOKIE_NAME } from './env';
import { isDevAuthBypassEnabled } from './dev-auth-bypass';
import { getPrismaClient } from './prisma';

export type AuthenticatedUser = NonNullable<Session['user']>;
export type CurrentUserSource = 'nextauth' | 'api-cookie' | 'dev-bypass' | null;

export interface CurrentUserResolution {
  user: AuthenticatedUser | null;
  source: CurrentUserSource;
}

const devAuthBypassEnabled = isDevAuthBypassEnabled();

if (devAuthBypassEnabled) {
  console.warn('[auth] TF_DEV_BYPASS_AUTH is enabled. Do not use in production.');
}

const DEV_BYPASS_EMAIL = 'demo@taskforge.dev';

async function getDevBypassUser(): Promise<AuthenticatedUser | null> {
  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.upsert({
      where: { email: DEV_BYPASS_EMAIL },
      update: {
        name: 'TaskForge Demo',
      },
      create: {
        email: DEV_BYPASS_EMAIL,
        name: 'TaskForge Demo',
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email,
      image: user.image ?? null,
    } satisfies AuthenticatedUser;
  } catch (error) {
    console.error('[auth] Failed to provision dev bypass user', error);
    return null;
  }
}

async function getApiUserFromCookie(): Promise<AuthenticatedUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const response = await fetch(getApiUrl('v1/me'), {
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
  const resolution = await getCurrentUserContext();
  return resolution.user;
}

export async function getCurrentUserContext(): Promise<CurrentUserResolution> {
  const session = await auth();
  if (session?.user) {
    return {
      user: session.user as AuthenticatedUser,
      source: 'nextauth',
    };
  }

  const apiUser = await getApiUserFromCookie();
  if (apiUser) {
    return {
      user: apiUser,
      source: 'api-cookie',
    };
  }

  if (devAuthBypassEnabled) {
    const bypassUser = await getDevBypassUser();
    if (bypassUser) {
      return {
        user: bypassUser,
        source: 'dev-bypass',
      };
    }
  }

  return {
    user: null,
    source: null,
  };
}
