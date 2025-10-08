import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/server-auth';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
