import 'server-only';

import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

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

export const authConfig = {
  providers: configuredProviders,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;

export function getAuthProviderSummaries(): AuthProviderSummary[] {
  return configuredProviders.map(({ id, name, type }) => ({ id, name, type }));
}
