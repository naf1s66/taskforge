import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

export type OAuthProviderId = 'github' | 'google';

const githubId = process.env.GITHUB_ID;
const githubSecret = process.env.GITHUB_SECRET;
const googleId = process.env.GOOGLE_ID;
const googleSecret = process.env.GOOGLE_SECRET;

const oauthProviders: OAuthProviderId[] = [];
const providers = [] as NextAuthOptions['providers'];

if (githubId && githubSecret) {
  oauthProviders.push('github');
  providers.push(
    GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
    }),
  );
}

if (googleId && googleSecret) {
  oauthProviders.push('google');
  providers.push(
    GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
    }),
  );
}

if (providers.length === 0) {
  providers.push(
    CredentialsProvider({
      name: 'Placeholder',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize() {
        return null;
      },
    }),
  );
}

export const configuredOAuthProviders: OAuthProviderId[] = [...oauthProviders];
export const hasOAuthProviders = oauthProviders.length > 0;

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
