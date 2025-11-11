import { randomUUID } from 'node:crypto';

import { Router, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { getSessionCookieName, resolveCookieDomain } from '@taskforge/shared';

import { createPasswordHasher, PasswordHasher } from '../auth/password';
import { createTokenService, TokenService } from '../auth/token';
import { InMemoryUserStore, StoredUser, UserStore } from '../auth/user-store';
import { createAuthMiddleware } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = registerSchema;
const sessionBridgeSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().optional(),
});

// Helper function to get cookie options
function getCookieOptions() {
  const domain = resolveCookieDomain({
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: process.env.API_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain,
  };
}

const SESSION_COOKIE_NAME = getSessionCookieName();

const noopLimiter: RequestHandler = (_req, _res, next) => next();
const authAttemptLimiter: RequestHandler =
  process.env.NODE_ENV === 'test'
    ? noopLimiter
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: req => req.ip ?? req.socket.remoteAddress ?? 'global',
        handler: (_req, res) => {
          res
            .status(429)
            .json({ error: 'Too many authentication attempts. Please try again later.' });
        },
      });

export interface AuthRouterOptions {
  userStore?: UserStore;
  passwordHasher?: PasswordHasher;
  tokenService?: TokenService;
  jwtSecret?: string;
  jwtRefreshSecret?: string;
  sessionBridgeSecret?: string;
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
  if (store instanceof InMemoryUserStore && process.env.NODE_ENV === 'production') {
    throw new Error('In-memory user store cannot be used in production. Configure a persistent store.');
  }

  const secret = options.jwtSecret ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required to initialize authentication routes.');
  }
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
  const bridgeSecret = options.sessionBridgeSecret ?? process.env.SESSION_BRIDGE_SECRET;
  if (!bridgeSecret) {
    console.warn('Session bridge endpoint disabled: SESSION_BRIDGE_SECRET is not configured.');
  }
  const authMiddleware = createAuthMiddleware({ tokenService: tokens, userStore: store });

  const router = Router();

  router.post('/register', authAttemptLimiter, async (req, res) => {
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
    res.cookie(SESSION_COOKIE_NAME, issuedTokens.accessToken, getCookieOptions());

    return res.status(201).json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      tokens: issuedTokens,
    });
  });

  router.post('/login', authAttemptLimiter, async (req, res) => {
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
    res.cookie(SESSION_COOKIE_NAME, issuedTokens.accessToken, getCookieOptions());

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
    res.clearCookie(SESSION_COOKIE_NAME, clearOptions);
    return res.status(200).json({ success: true });
  });

  if (bridgeSecret) {
    router.post('/session-bridge', authAttemptLimiter, async (req, res) => {
      const providedSecret = req.get('x-session-bridge-secret');

      if (!providedSecret || providedSecret !== bridgeSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parse = sessionBridgeSchema.safeParse(req.body);

      if (!parse.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
      }

      const { userId, email } = parse.data;

      let user = await store.findById(userId);

      if (!user && email) {
        user = await store.findByEmail(email);
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (email && user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(409).json({ error: 'User email mismatch' });
      }

      const issuedTokens = await tokens.issueTokens(user.id);

      res.cookie(SESSION_COOKIE_NAME, issuedTokens.accessToken, getCookieOptions());

      return res.json({
        user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
        tokens: issuedTokens,
      });
    });
  }

  const refreshSchema = z.object({
    refreshToken: z.string().min(1),
  });

  router.post('/refresh', authAttemptLimiter, async (req, res) => {
    const parse = refreshSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
    }

    try {
      const payload = await tokens.verifyRefreshToken(parse.data.refreshToken);
      const user = await store.findById(payload.sub);

      if (!user) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const issuedTokens = await tokens.issueTokens(user.id);
      res.cookie(SESSION_COOKIE_NAME, issuedTokens.accessToken, getCookieOptions());

      return res.json({
        user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
        tokens: issuedTokens,
      });
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  });

  router.get('/me', authMiddleware, (_req, res) => {
    const authUser = res.locals.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.json({ user: authUser });
  });

  return { router, authMiddleware, store, tokens };
}
