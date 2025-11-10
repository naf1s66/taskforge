'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

import type { AuthenticatedUser } from './server-auth';

type NextAuthStatus = ReturnType<typeof useSession>['status'];

export type AuthStatus = NextAuthStatus;

type ApiMeResponse = {
  user: { id: string; email: string | null } | null;
};

export function useAuth(): { user: AuthenticatedUser | null; status: AuthStatus } {
  const { data, status } = useSession();
  const [apiUser, setApiUser] = useState<AuthenticatedUser | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [hasCheckedApi, setHasCheckedApi] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (status === 'authenticated') {
      setApiUser(null);
      setIsApiLoading(false);
      setHasCheckedApi(false);
      return;
    }

    if (status === 'loading') {
      setIsApiLoading(true);
      return () => {
        cancelled = true;
      };
    }

    async function resolveApiUser() {
      setIsApiLoading(true);
      setHasCheckedApi(false);

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setApiUser(null);
          return;
        }

        const payload = (await response.json().catch(() => null)) as ApiMeResponse | null;

        if (payload?.user?.id) {
          setApiUser({
            id: payload.user.id,
            email: payload.user.email,
            name: payload.user.email,
            image: null,
          });
        } else {
          setApiUser(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[auth] Failed to resolve API user', error);
          setApiUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsApiLoading(false);
          setHasCheckedApi(true);
        }
      }
    }

    void resolveApiUser();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const sessionUser = useMemo(
    () => ((data?.user as AuthenticatedUser | undefined) ?? null),
    [data?.user],
  );

  const user = sessionUser ?? apiUser;

  const effectiveStatus: AuthStatus = useMemo(() => {
    if (sessionUser) {
      return 'authenticated';
    }

    if (status === 'loading' || isApiLoading) {
      return 'loading';
    }

    if (apiUser) {
      return 'authenticated';
    }

    if (hasCheckedApi) {
      return 'unauthenticated';
    }

    return status;
  }, [apiUser, hasCheckedApi, isApiLoading, sessionUser, status]);

  return {
    user,
    status: effectiveStatus,
  };
}
