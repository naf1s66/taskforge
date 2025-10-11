'use client';

import { useSession } from 'next-auth/react';

import type { AuthenticatedUser } from './server-auth';

export type AuthStatus = ReturnType<typeof useSession>['status'];

export function useAuth(): { user: AuthenticatedUser | null; status: AuthStatus } {
  const { data, status } = useSession();

  return {
    user: (data?.user as AuthenticatedUser | undefined) ?? null,
    status,
  };
}
