import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

import type { AuthUser } from '@/types/auth';

declare module 'next-auth' {
  interface Session {
    user: AuthUser & DefaultSession['user'];
    accessToken?: string;
    error?: string;
  }

  interface User extends AuthUser {
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    user?: AuthUser;
    accessToken?: string;
    error?: string;
  }
}
