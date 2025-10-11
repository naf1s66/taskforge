'use client';

import { useEffect, useMemo } from 'react';
import type { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import type { AuthUser } from '@/types/auth';

type UseAuthResult = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

export function useAuth(): UseAuthResult {
  const { data, status } = useSession();
  const session = (data as (Session & { error?: string }) | null) ?? null;

  const loading = status === 'loading';
  const user = (session?.user as AuthUser | undefined) ?? null;
  const error = session?.error ?? null;

  useEffect(() => {
    if (error) {
      toast.error(error, {
        duration: 4000,
      });
    }
  }, [error]);

  return useMemo(
    () => ({
      user,
      loading,
      error,
    }),
    [user, loading, error],
  );
}
