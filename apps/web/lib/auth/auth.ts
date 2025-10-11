import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';

import { authOptions } from './options';

export function auth(): Promise<Session | null> {
  return (getServerSession as unknown as (options: unknown) => Promise<Session | null>)(authOptions);
}
