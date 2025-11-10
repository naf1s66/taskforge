import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server-auth';
import { ensureApiSessionCookie } from '@/lib/session-bridge';

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

  try {
    await ensureApiSessionCookie(user);
  } catch (error) {
    console.error('[auth] Failed to ensure API session', error);
    const search = new URLSearchParams({ from: fromPath, reason: 'session-bridge' });
    redirect(`/login?${search.toString()}`);
  }

  return <>{children}</>;
}
