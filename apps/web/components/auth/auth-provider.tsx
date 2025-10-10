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
  | { success: true; user: AuthUser }
  | { success: false; message: string; fieldErrors?: FieldErrors };

type AuthContextValue = {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (payload: CredentialsPayload) => Promise<AuthActionResult>;
  register: (payload: CredentialsPayload) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Note: Session cookies are now managed server-side with HttpOnly flag
// No client-side cookie manipulation needed for security

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
      credentials: 'include', // Include HttpOnly cookies
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : 'Unable to authenticate';
      const fieldErrors = data?.details?.fieldErrors as FieldErrors | undefined;
      return { success: false, message, fieldErrors };
    }

    return { success: true, user: data.user as AuthUser };
  } catch (error) {
    console.error(`[auth] Failed to ${endpoint}`, error);
    return { success: false, message: 'Unexpected error. Please try again.' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const setSession = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    setStatus(nextUser ? 'authenticated' : 'unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
        credentials: 'include', // Include HttpOnly cookies
      });

      if (!res.ok) {
        setSession(null);
        return;
      }

      const data = (await res.json()) as { user?: AuthUser };
      if (data.user) {
        setSession(data.user);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('[auth] Failed to refresh session', error);
      setSession(null);
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
        setSession(result.user);
      }

      return result;
    },
    [setSession],
  );

  const register = useCallback(
    async (payload: CredentialsPayload): Promise<AuthActionResult> => {
      const result = await requestWithCredentials('register', payload);

      if (result.success) {
        setSession(result.user);
      }

      return result;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include HttpOnly cookies
      });
    } catch (error) {
      console.warn('[auth] Logout request failed', error);
    } finally {
      setSession(null);
    }
  }, [setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refresh }),
    [login, logout, refresh, register, status, user],
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
