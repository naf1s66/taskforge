import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export type OAuthProviderId = 'github' | 'google';

const githubId = process.env.GITHUB_ID;
const githubSecret = process.env.GITHUB_SECRET;
const googleId = process.env.GOOGLE_ID;
const googleSecret = process.env.GOOGLE_SECRET;

const oauthProviders: OAuthProviderId[] = [];
const providers = [] as NextAuthOptions['providers'];

const isProduction = process.env.NODE_ENV === 'production';
const devLoginEmail = process.env.DEV_LOGIN_EMAIL ?? 'dev@taskforge.test';
const devLoginName = process.env.DEV_LOGIN_NAME ?? 'TaskForge Demo';
const devLoginAvatar = process.env.DEV_LOGIN_AVATAR ?? null;

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

const devSignInEnabled = !isProduction && oauthProviders.length === 0;
const devUserProfile = {
  id: 'dev-user',
  email: devLoginEmail,
  name: devLoginName,
  image: devLoginAvatar,
};

if (providers.length === 0) {
  providers.push(
    CredentialsProvider({
      id: 'dev',
      name: devSignInEnabled ? 'Development login' : 'Placeholder',
      credentials: {
        email: { label: 'Email', type: 'email', value: devLoginEmail },
      },
      async authorize(credentials) {
        if (!devSignInEnabled) {
          return null;
        }

        const email = credentials?.email?.trim() || devUserProfile.email;

        return {
          id: devUserProfile.id,
          email,
          name: devUserProfile.name,
          image: devUserProfile.image ?? undefined,
        };
      },
    }),
  );
}

export const configuredOAuthProviders: OAuthProviderId[] = [...oauthProviders];
export const hasOAuthProviders = oauthProviders.length > 0;
export const devSignInProfile = devSignInEnabled ? devUserProfile : null;
export const isDevSignInEnabled = devSignInEnabled;

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
