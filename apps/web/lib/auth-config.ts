import 'server-only';

import type { NextAuthConfig } from 'next-auth';
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { getPrismaClient } from './prisma';
import { scheduleWelcomeEmail } from './welcome-email';

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

const providers = configuredProviders;

const prisma = getPrismaClient();

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase();
}

function dispatchWelcomeEmail(user: Pick<AdapterUser, 'id' | 'email'>) {
  void scheduleWelcomeEmail({ id: user.id, email: user.email }).catch(error => {
    console.error('[notifications] Welcome email scheduling failed', {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

function mapAccountToPrisma(account: AdapterAccount) {
  const expiresAt = typeof account.expires_at === 'number' ? Math.floor(account.expires_at) : null;
  const sessionState = typeof account.session_state === 'string' ? account.session_state : null;

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
    sessionState,
  };
}

async function ensureAccountLink(account: AdapterAccount) {
  const data = mapAccountToPrisma(account);

  const update: Parameters<typeof prisma.account.upsert>[0]['update'] = {
    userId: data.userId,
    type: data.type,
  };

  if (typeof account.refresh_token !== 'undefined') {
    update.refreshToken = data.refreshToken;
  }

  if (typeof account.access_token !== 'undefined') {
    update.accessToken = data.accessToken;
  }

  if (typeof account.expires_at !== 'undefined') {
    update.expiresAt = data.expiresAt;
  }

  if (typeof account.token_type !== 'undefined') {
    update.tokenType = data.tokenType;
  }

  if (typeof account.scope !== 'undefined') {
    update.scope = data.scope;
  }

  if (typeof account.id_token !== 'undefined') {
    update.idToken = data.idToken;
  }

  if (typeof account.session_state !== 'undefined') {
    update.sessionState = data.sessionState;
  }

  return prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: data.provider,
        providerAccountId: data.providerAccountId,
      },
    },
    create: data,
    update,
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

    const created = await baseAdapter.createUser(payload);

    dispatchWelcomeEmail(created);

    return created;
  },
  async linkAccount(account: AdapterAccount) {
    const linked = await ensureAccountLink(account);

    console.info('[auth] OAuth account linked', {
      userId: linked.userId,
      provider: linked.provider,
    });

    return undefined;
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
    async signIn({ user, account, profile }) {
      if (!account || account.type !== 'oauth') {
        return true;
      }

      const adapterUser = user as AdapterUser;
      const typedProfile = (profile ?? {}) as {
        email?: unknown;
        email_verified?: unknown;
      };

      const profileEmail = typeof typedProfile.email === 'string' ? typedProfile.email : null;
      const normalizedEmail = normalizeEmail(adapterUser.email ?? profileEmail);

      if (!normalizedEmail) {
        console.warn('[auth] OAuth sign-in missing email', {
          provider: account.provider,
        });
        return false;
      }

      const emailVerifiedRaw = typedProfile.email_verified;
      const emailVerified =
        typeof emailVerifiedRaw === 'boolean'
          ? emailVerifiedRaw
          : typeof emailVerifiedRaw === 'string'
            ? emailVerifiedRaw.toLowerCase() === 'true'
            : null;

      if (account.provider === 'google') {
        if (emailVerified !== true) {
          console.warn('[auth] Google sign-in rejected due to unverified email', {
            email: normalizedEmail,
          });
          return false;
        }
      } else if (emailVerified === false) {
        console.warn('[auth] OAuth sign-in rejected due to explicitly unverified email', {
          provider: account.provider,
          email: normalizedEmail,
        });
        return false;
      }

      adapterUser.email = normalizedEmail;
      adapterUser.emailVerified = emailVerified ? new Date() : null;

      return true;
    },
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
      let resolvedUserId: string | undefined = user?.id ?? token?.sub ?? session.user?.id;

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
