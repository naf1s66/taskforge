import type { AdapterUser } from 'next-auth/adapters';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';

import { getApiBaseUrl } from '@/lib/env';
import type { AuthUser } from '@/types/auth';

type ApiAuthResponse = {
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
  token: string;
};

type JwtParams = {
  token: JWT & { user?: AuthUser; accessToken?: string; error?: string };
  user?: (AdapterUser & { accessToken?: string }) | (AuthUser & { accessToken?: string });
  trigger?: 'update' | 'signIn' | 'signUp';
  session?: (Session & { error?: string }) | null;
};

type SessionParams = {
  session: Session & { error?: string };
  token: JWT & { user?: AuthUser; accessToken?: string; error?: string };
};

type SignOutParams = {
  token?: (JWT & { accessToken?: string }) | null;
};

type AppAuthOptions = {
  pages: {
    signIn: string;
  };
  session: {
    strategy: 'jwt';
  };
  providers: ReturnType<typeof Credentials>[];
  callbacks: {
    jwt: (params: JwtParams) => Promise<JwtParams['token']>;
    session: (params: SessionParams) => Promise<SessionParams['session']>;
  };
  events: {
    signOut: (params: SignOutParams) => Promise<void> | void;
  };
  secret: string;
};

export const authOptions: AppAuthOptions = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            let message = 'Unable to sign in with those credentials';
            try {
              const errorBody = await response.json();
              if (typeof errorBody?.error === 'string') {
                message = errorBody.error;
              }
            } catch {
              // ignore JSON parse errors
            }
            throw new Error(message);
          }

          const data = (await response.json()) as ApiAuthResponse;

          if (!data?.user?.id || !data?.token) {
            return null;
          }

          return {
            id: data.user.id,
            email: data.user.email,
            createdAt: data.user.createdAt,
            accessToken: data.token,
          };
        } catch (error) {
          console.error('[next-auth] Failed to authorize credentials', error);
          throw new Error(
            error instanceof Error ? error.message : 'Unexpected authentication error. Please try again.',
          );
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: JwtParams) {
      if (user) {
        const createdAt = 'createdAt' in user && typeof user.createdAt === 'string'
          ? user.createdAt
          : new Date().toISOString();
        token.user = {
          id: user.id,
          email: user.email,
          createdAt,
        };
        if ('accessToken' in user && user.accessToken) {
          token.accessToken = user.accessToken;
        }
        delete (token as Record<string, unknown>).error;
      }

      if (trigger === 'update' && session?.error) {
        token.error = session.error;
      }

      return token;
    },
    async session({ session, token }: SessionParams) {
      if (token.user) {
        session.user = token.user as typeof session.user;
      }

      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }

      if (token.error) {
        session.error = token.error;
      }

      return session;
    },
  },
  events: {
    async signOut({ token }: SignOutParams) {
      if (!token?.accessToken) {
        return;
      }

      try {
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
          },
          cache: 'no-store',
        });
      } catch (error) {
        console.warn('[next-auth] Failed to propagate logout to API', error);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET ?? 'taskforge-dev-secret',
};
