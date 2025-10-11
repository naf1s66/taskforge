import 'server-only';

import type { AuthUser } from '@/types/auth';
import { auth } from './auth/auth';

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await auth();
    if (!session?.user) {
      return null;
    }
    return {
      id: session.user.id,
      email: session.user.email,
      createdAt: session.user.createdAt,
    };
  } catch (error) {
    console.error('[auth] Failed to resolve current user from session', error);
    return null;
  }
}
