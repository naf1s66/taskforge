import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server-auth';
import { SESSION_COOKIE_NAME } from '@/lib/env';

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

  const user = await getCurrentUser();

  if (!user) {
    const search = new URLSearchParams({ from: fromPath });
    redirect(`/login?${search.toString()}`);
  }

  const cookieStore = cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME);

  if (!existing) {
    const search = new URLSearchParams({ from: fromPath });
    redirect(`/auth/session-bridge?${search.toString()}`);
  }

  return <>{children}</>;
}
