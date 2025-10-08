import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
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

    const search = new URLSearchParams({ from: fromPath });
    redirect(`/login?${search.toString()}`);
  }

  return <>{children}</>;
}
