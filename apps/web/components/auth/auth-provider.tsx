'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getApiBaseUrl, SESSION_COOKIE_NAME } from '@/lib/env';

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type CredentialsPayload = {
  email: string;
  password: string;
};

export type FieldErrors = Record<string, string[]>;

export type AuthActionResult =
  | { success: true; user: AuthUser; token: string }
  | { success: false; message: string; fieldErrors?: FieldErrors };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (payload: CredentialsPayload) => Promise<AuthActionResult>;
  register: (payload: CredentialsPayload) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readTokenFromDocument(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SESSION_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function setSessionCookie(token: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const maxAgeDays = 7;
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${
    maxAgeDays * 24 * 60 * 60
  }; SameSite=Lax`;
}

function clearSessionCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

async function requestWithCredentials(
  endpoint: 'login' | 'register',
  payload: CredentialsPayload,
): Promise<AuthActionResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : 'Unable to authenticate';
      const fieldErrors = data?.details?.fieldErrors as FieldErrors | undefined;
      return { success: false, message, fieldErrors };
    }

    return { success: true, user: data.user as AuthUser, token: data.token as string };
  } catch (error) {
    console.error(`[auth] Failed to ${endpoint}`, error);
    return { success: false, message: 'Unexpected error. Please try again.' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const setSession = useCallback((nextToken: string | null, nextUser: AuthUser | null) => {
    setToken(nextToken);
    setUser(nextUser);
    setStatus(nextToken && nextUser ? 'authenticated' : 'unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    const existingToken = readTokenFromDocument();

    if (!existingToken) {
      setSession(null, null);
      return;
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
        headers: {
          Authorization: `Bearer ${existingToken}`,
        },
      });

      if (!res.ok) {
        clearSessionCookie();
        setSession(null, null);
        return;
      }

      const data = (await res.json()) as { user?: AuthUser };
      if (data.user) {
        setSession(existingToken, data.user);
      } else {
        clearSessionCookie();
        setSession(null, null);
      }
    } catch (error) {
      console.error('[auth] Failed to refresh session', error);
      setSession(null, null);
    }
  }, [setSession]);

  useEffect(() => {
    void refresh().finally(() => {
      setStatus((prev) => (prev === 'loading' ? 'unauthenticated' : prev));
    });
  }, [refresh]);

  const login = useCallback(
    async (payload: CredentialsPayload): Promise<AuthActionResult> => {
      const result = await requestWithCredentials('login', payload);

      if (result.success) {
        setSessionCookie(result.token);
        setSession(result.token, result.user);
      }

      return result;
    },
    [setSession],
  );

  const register = useCallback(
    async (payload: CredentialsPayload): Promise<AuthActionResult> => {
      const result = await requestWithCredentials('register', payload);

      if (result.success) {
        setSessionCookie(result.token);
        setSession(result.token, result.user);
      }

      return result;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    const activeToken = readTokenFromDocument();

    try {
      if (activeToken) {
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });
      }
    } catch (error) {
      console.warn('[auth] Logout request failed', error);
    } finally {
      clearSessionCookie();
      setSession(null, null);
    }
  }, [setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, status, login, register, logout, refresh }),
    [login, logout, refresh, register, status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
