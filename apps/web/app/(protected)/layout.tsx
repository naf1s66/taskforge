import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isSessionTokenExpired } from '@/lib/session-bridge';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  if (process.env.ALLOW_UNAUTHENTICATED_PREVIEW === 'true') {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[protected-layout] Bypassing auth guard for preview.');
    }
    return <>{children}</>;
  }

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

  const [{ getCurrentUser }, { SESSION_COOKIE_NAME }] = await Promise.all([
    import('@/lib/server-auth'),
    import('@/lib/env'),
  ]);

  const user = await getCurrentUser();

  if (!user) {
    const search = new URLSearchParams({ from: fromPath });
    redirect(`/login?${search.toString()}`);
  }

  const cookieStore = cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME);

  if (!existing?.value || isSessionTokenExpired(existing.value)) {
    const search = new URLSearchParams({ from: fromPath });
    redirect(`/auth/session-bridge?${search.toString()}`);
  }

  return <>{children}</>;
}
