import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/server-auth';
import { getApiUrl, SESSION_COOKIE_NAME } from '@/lib/env';
import { shouldRedirectToSessionBridge } from '@/lib/bridged-session';

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
    console.error('[auth] Failed to validate protected API session cookie', error);
    return false;
  }
}

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const headerList = headers();
  const forwardedUrl = headerList.get('x-forwarded-url');
  const invokePath = headerList.get('x-invoke-path');

  let fromPath = '/';

  if (forwardedUrl) {
    try {
      const url = new URL(forwardedUrl);
      fromPath = url.pathname || '/';
    } catch {
      // ignore parse errors
    }
  } else if (invokePath) {
    fromPath = invokePath;
  }

  const { user, source } = await getCurrentUserContext();

  if (!user) {
    const search = new URLSearchParams({ from: fromPath });
    redirect(`/login?${search.toString()}`);
  }

  const cookieStore = cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME);
  const existingToken = existing?.value;
  const hasInvalidNextAuthApiCookie =
    source === 'nextauth' &&
    existingToken !== undefined &&
    !(await hasUsableApiSessionCookie(existingToken));

  if (shouldRedirectToSessionBridge(source, existingToken) || hasInvalidNextAuthApiCookie) {
    const search = new URLSearchParams({ from: fromPath });
    redirect(`/auth/session-bridge?${search.toString()}`);
  }

  return <>{children}</>;
}
