'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useSession } from 'next-auth/react';

import type { AuthenticatedUser } from './server-auth';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

type ApiMeResponse = {
  user: { id: string; email: string | null } | null;
};

type AuthContextValue = {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  error: string | null;
  isLoading: boolean;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readApiUser(): Promise<ApiMeResponse | null> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'x-requested-with': 'fetch' },
  });

  if (!response.ok) {
    const error = new Error(`Failed to fetch API session (status ${response.status})`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return (await response.json().catch(() => null)) as ApiMeResponse | null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { data, status: sessionStatus } = useSession();
  const sessionUser = useMemo(
    () => ((data?.user as AuthenticatedUser | undefined) ?? null),
    [data?.user],
  );

  const [apiUser, setApiUser] = useState<AuthenticatedUser | null>(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [hasCheckedApi, setHasCheckedApi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (sessionStatus === 'loading') {
      setIsCheckingApi(true);
      setHasCheckedApi(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    if (sessionStatus === 'authenticated') {
      setApiUser(null);
      setIsCheckingApi(false);
      setHasCheckedApi(true);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    async function resolveApiUser() {
      setIsCheckingApi(true);
      setHasCheckedApi(false);
      setError(null);

      try {
        const payload = await readApiUser();

        if (cancelled) {
          return;
        }

        if (payload?.user?.id) {
          setApiUser({
            id: payload.user.id,
            email: payload.user.email,
            name: payload.user.email,
            image: null,
          });
          setError(null);
        } else {
          setApiUser(null);
          setError(null);
        }
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        const status = (fetchError as Error & { status?: number }).status ?? 0;

        if (status === 401) {
          // A 401 simply means no authenticated user; treat it as an idle session
          setApiUser(null);
          setError(null);
          return;
        }

        const friendlyMessage =
          status >= 500
            ? 'We were unable to confirm your session due to a server issue. Please try again shortly.'
            : 'We could not verify your session. Please check your connection or sign in again.';

        console.error('[auth] Failed to resolve API user', fetchError);
        setApiUser(null);
        setError(friendlyMessage);
      } finally {
        if (cancelled) {
          return;
        }

        setIsCheckingApi(false);
        setHasCheckedApi(true);
      }
    }

    void resolveApiUser();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, refreshNonce]);

  const resolvedUser = sessionUser ?? apiUser;

  const derivedStatus: AuthStatus = useMemo(() => {
    if (resolvedUser) {
      return 'authenticated';
    }

    if (sessionStatus === 'loading' || isCheckingApi || !hasCheckedApi) {
      return 'loading';
    }

    if (error) {
      return 'error';
    }

    return 'idle';
  }, [resolvedUser, sessionStatus, isCheckingApi, hasCheckedApi, error]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: resolvedUser,
      status: derivedStatus,
      error,
      isLoading: derivedStatus === 'loading',
      refresh,
    }),
    [derivedStatus, error, refresh, resolvedUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
