import 'server-only';

import type { Account, NextAuthConfig, Session } from 'next-auth';
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters';
import type { JWT } from 'next-auth/jwt';
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

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase();
}

function mapAccountToPrisma(account: AdapterAccount) {
  const expiresAt = typeof account.expires_at === 'number' ? Math.floor(account.expires_at) : null;

  return {
    userId: account.userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refreshToken: account.refresh_token ?? null,
    accessToken: account.access_token ?? null,
    expiresAt,
    tokenType: account.token_type ?? null,
    scope: account.scope ?? null,
    idToken: account.id_token ?? null,
    sessionState: account.session_state ?? null,
  };
}

async function ensureAccountLink(account: AdapterAccount) {
  const data = mapAccountToPrisma(account);

  return prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: data.provider,
        providerAccountId: data.providerAccountId,
      },
    },
    create: data,
    update: {
      userId: data.userId,
      type: data.type,
      refreshToken: data.refreshToken,
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
      tokenType: data.tokenType,
      scope: data.scope,
      idToken: data.idToken,
      sessionState: data.sessionState,
    },
  });
}

async function resolveUserForOAuth(user: AdapterUser) {
  const normalizedEmail = normalizeEmail(user.email ?? null);

  if (!normalizedEmail || !user.emailVerified) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!existingUser) {
    return null;
  }

  const updates: {
    name?: string;
    image?: string;
    emailVerified?: Date | null;
  } = {};

  if (user.name && !existingUser.name) {
    updates.name = user.name;
  }

  if (user.image && !existingUser.image) {
    updates.image = user.image;
  }

  if (user.emailVerified && !existingUser.emailVerified) {
    updates.emailVerified = user.emailVerified;
  }

  if (Object.keys(updates).length > 0) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: updates,
    });

    return updated;
  }

  return existingUser;
}

const baseAdapter = PrismaAdapter(prisma);

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(user: AdapterUser) {
    const resolved = await resolveUserForOAuth(user);

    if (resolved) {
      console.info('[auth] Reusing existing user for OAuth sign-in', {
        userId: resolved.id,
        email: resolved.email,
      });

      return resolved;
    }

    const normalizedEmail = normalizeEmail(user.email ?? null);
    const payload: AdapterUser = normalizedEmail ? { ...user, email: normalizedEmail } : user;

    if (!baseAdapter.createUser) {
      throw new Error('Prisma adapter does not implement createUser');
    }

    return baseAdapter.createUser(payload);
  },
  async linkAccount(account: AdapterAccount) {
    const linked = await ensureAccountLink(account);

    console.info('[auth] OAuth account linked', {
      userId: linked.userId,
      provider: linked.provider,
    });

    return linked;
  },
};

export const authConfig = {
  adapter,
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
    async signIn({
      user,
      account,
      profile,
    }: {
      user: AdapterUser;
      account: Account | null;
      profile?: Record<string, unknown> | null;
    }) {
      if (!account || account.type !== 'oauth') {
        return true;
      }

      const typedProfile = (profile ?? {}) as {
        email?: unknown;
        email_verified?: unknown;
      };

      const profileEmail = typeof typedProfile.email === 'string' ? typedProfile.email : null;
      const normalizedEmail = normalizeEmail(user?.email ?? profileEmail);

      if (!normalizedEmail) {
        console.warn('[auth] OAuth sign-in missing email', {
          provider: account.provider,
        });
        return false;
      }

      const emailVerifiedRaw = typedProfile.email_verified;
      let isEmailVerified = false;

      if (account.provider === 'google') {
        const emailVerified =
          typeof emailVerifiedRaw === 'boolean'
            ? emailVerifiedRaw
            : typeof emailVerifiedRaw === 'string'
              ? emailVerifiedRaw.toLowerCase() === 'true'
              : true;

        if (!emailVerified) {
          console.warn('[auth] Google sign-in rejected due to unverified email', {
            email: normalizedEmail,
          });
          return false;
        }

        isEmailVerified = true;
      } else {
        const emailVerified =
          typeof emailVerifiedRaw === 'boolean'
            ? emailVerifiedRaw
            : typeof emailVerifiedRaw === 'string'
              ? emailVerifiedRaw.toLowerCase() === 'true'
              : null;

        if (emailVerified !== true) {
          console.warn('[auth] OAuth sign-in rejected due to unverifiable email', {
            provider: account.provider,
            email: normalizedEmail,
          });
          return false;
        }

        isEmailVerified = true;
      }

      user.email = normalizedEmail;
      user.emailVerified = isEmailVerified ? new Date() : null;

      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: AdapterUser | null }) {
      if (user?.id) {
        token.sub = user.id;
        console.info('[auth] JWT callback user matched', {
          userId: user.id,
        });
      }

      return token;
    },
    async session({
      session,
      user,
      token,
    }: {
      session: Session;
      user?: AdapterUser | null;
      token: JWT;
    }) {
      let resolvedUserId = user?.id ?? token?.sub ?? session.user?.id;

      if (!resolvedUserId && session.user?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });

        resolvedUserId = existingUser?.id;
      }

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
    async signIn({
      user,
      isNewUser,
    }: {
      user: AdapterUser;
      isNewUser?: boolean;
    }) {
      console.info('[auth] Sign-in completed', {
        userId: user.id,
        isNewUser,
      });
    },
    async linkAccount({ user }: { user: AdapterUser }) {
      console.info('[auth] Account linked for user', user.id);
    },
  },
} satisfies NextAuthConfig;

export function getAuthProviderSummaries(): AuthProviderSummary[] {
  return configuredProviders.map(({ id, name, type }) => ({ id, name, type }));
}
