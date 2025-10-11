import NextAuth from 'next-auth/next';

import { authOptions } from '@/lib/auth/options';

const handler = (NextAuth as unknown as (options: unknown) => ReturnType<typeof NextAuth>)(authOptions);

export { handler as GET, handler as POST };
