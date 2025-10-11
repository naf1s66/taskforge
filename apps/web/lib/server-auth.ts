import 'server-only';

import type { Session } from 'next-auth';

import { auth } from './auth';

export type AuthenticatedUser = NonNullable<Session['user']>;

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  return session?.user ?? null;
}
