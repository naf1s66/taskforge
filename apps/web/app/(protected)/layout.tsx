import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserContext } from '@/lib/server-auth';
import { SESSION_COOKIE_NAME } from '@/lib/env';
import { shouldRedirectToSessionBridge } from '@/lib/bridged-session';

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

  if (shouldRedirectToSessionBridge(source, existing?.value)) {
    const search = new URLSearchParams({ from: fromPath });
    redirect(`/auth/session-bridge?${search.toString()}`);
  }

  return <>{children}</>;
}
