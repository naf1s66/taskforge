import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import { createPasswordHasher, PasswordHasher } from '../auth/password';
import { createTokenService, TokenService } from '../auth/token';
import { InMemoryUserStore, StoredUser, UserStore } from '../auth/user-store';
import { createAuthMiddleware } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = registerSchema;

// Helper function to get cookie domain for cross-subdomain sharing
function getCookieDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN;
  if (domain) {
    return domain;
  }
  
  // In production, use shared parent domain for cross-subdomain cookies
  if (process.env.NODE_ENV === 'production') {
    // Extract domain from API_BASE_URL or use default
    const apiUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiUrl) {
      try {
        const url = new URL(apiUrl);
        const hostname = url.hostname;
        
        // If it's a subdomain like api.taskforge.app, return .taskforge.app
        const parts = hostname.split('.');
        if (parts.length >= 3) {
          return '.' + parts.slice(-2).join('.');
        }
        // If it's already a root domain, use it as-is
        return '.' + hostname;
      } catch {
        // Fallback if URL parsing fails
      }
    }
  }
  
  // For development, don't set domain (defaults to current host)
  return undefined;
}

// Helper function to get cookie options
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: getCookieDomain(),
  };
}

export interface AuthRouterOptions {
  userStore?: UserStore;
  passwordHasher?: PasswordHasher;
  tokenService?: TokenService;
  jwtSecret?: string;
  jwtRefreshSecret?: string;
  bcryptSaltRounds?: number;
  accessTokenExpiresIn?: string | number;
  refreshTokenExpiresIn?: string | number;
}

function resolveSaltRounds(explicit?: number): number {
  if (explicit && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const fromEnv = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }

  return 10;
}

function resolveExpiresIn(value?: string | number, envKey?: string, fallback?: string | number) {
  if (value) return value;
  if (envKey) {
    const fromEnv = process.env[envKey];
    if (fromEnv) return fromEnv;
  }
  return fallback;
}

export function createAuthRouter(options: AuthRouterOptions = {}) {
  const store = options.userStore ?? new InMemoryUserStore();
  const saltRounds = resolveSaltRounds(options.bcryptSaltRounds);
  const hasher = options.passwordHasher ?? createPasswordHasher(saltRounds);
  const secret = options.jwtSecret ?? process.env.JWT_SECRET ?? 'dev-secret';
  const refreshSecret = options.jwtRefreshSecret ?? process.env.JWT_REFRESH_SECRET;
  const accessExpiresIn = resolveExpiresIn(
    options.accessTokenExpiresIn,
    'JWT_ACCESS_TOKEN_EXPIRES_IN',
    '1h',
  );
  const refreshExpiresIn = resolveExpiresIn(
    options.refreshTokenExpiresIn,
    'JWT_REFRESH_TOKEN_EXPIRES_IN',
    '7d',
  );
  const tokens =
    options.tokenService ??
    createTokenService({
      accessSecret: secret,
      refreshSecret: refreshSecret ?? undefined,
      accessExpiresIn,
      refreshExpiresIn,
    });
  const authMiddleware = createAuthMiddleware({ tokenService: tokens, userStore: store });

  const router = Router();

  router.post('/register', async (req, res) => {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
    }

    const existing = await store.findByEmail(parse.data.email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const user: StoredUser = {
      id: randomUUID(),
      email: parse.data.email,
      passwordHash: await hasher.hash(parse.data.password),
      createdAt: new Date(),
    };

    await store.create(user);
    const issuedTokens = await tokens.issueTokens(user.id);

    // Set HttpOnly cookie with shared domain for cross-subdomain access
    res.cookie('tf_session', issuedTokens.accessToken, getCookieOptions());

    return res.status(201).json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      tokens: issuedTokens,
    });
  });

  router.post('/login', async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
    }

    const user = await store.findByEmail(parse.data.email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await hasher.verify(parse.data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const issuedTokens = await tokens.issueTokens(user.id);

    // Set HttpOnly cookie with shared domain for cross-subdomain access
    res.cookie('tf_session', issuedTokens.accessToken, getCookieOptions());

    return res.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      tokens: issuedTokens,
    });
  });

  router.post('/logout', authMiddleware, (_req, res) => {
    // Clear the HttpOnly cookie with same options used to set it
    const cookieOptions = getCookieOptions();
    // Remove maxAge for clearing
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie('tf_session', clearOptions);
    return res.status(200).json({ success: true });
  });

  router.get('/me', authMiddleware, (_req, res) => {
    const authUser = res.locals.user as { id: string; email: string; createdAt: string } | undefined;
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.json({ user: authUser });
  });

  return { router, authMiddleware, store, tokens };
}
