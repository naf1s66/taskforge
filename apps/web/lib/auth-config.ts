import 'server-only';

import type { NextAuthConfig } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { getPrismaClient } from './prisma';

export type AuthProviderSummary = {
  id: string;
  name: string;
  type: string;
};

function createGitHubProvider() {
  const clientId = process.env.GITHUB_ID;
  const clientSecret = process.env.GITHUB_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return GitHub({
    clientId,
    clientSecret,
  });
}

function createGoogleProvider() {
  const clientId = process.env.GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return Google({
    clientId,
    clientSecret,
  });
}

const configuredProviders = [
  createGitHubProvider(),
  createGoogleProvider(),
].filter(Boolean) as Array<ReturnType<typeof GitHub> | ReturnType<typeof Google>>;

const developmentFallbackProvider = Credentials({
  id: 'dev-placeholder',
  name: 'Development Placeholder',
  credentials: {},
  authorize: async () => null,
});

const providers =
  configuredProviders.length > 0
    ? configuredProviders
    : [developmentFallbackProvider];

const prisma = getPrismaClient();

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        console.info('[auth] JWT callback user matched', {
          userId: user.id,
        });
      }

      return token;
    },
    async session({ session, user, token }) {
      const resolvedUserId = user?.id ?? token?.sub ?? session.user?.id;

      if (session.user && resolvedUserId) {
        session.user.id = resolvedUserId;
      }

      if (resolvedUserId) {
        console.info('[auth] Session issued for user', resolvedUserId);
      }

      return session;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      console.info('[auth] Sign-in completed', {
        userId: user.id,
        isNewUser,
      });
    },
    async linkAccount({ user }) {
      console.info('[auth] Account linked for user', user.id);
    },
  },
} satisfies NextAuthConfig;

export function getAuthProviderSummaries(): AuthProviderSummary[] {
  return configuredProviders.map(({ id, name, type }) => ({ id, name, type }));
}
