'use client';

import type { PropsWithChildren } from 'react';

import { useAuth } from '@/hooks/use-auth';

export function SessionGate({ children }: PropsWithChildren) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border/60 bg-card/60 text-sm text-muted-foreground">
        Restoring your session…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
