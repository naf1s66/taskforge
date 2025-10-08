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

export interface AuthRouterOptions {
  userStore?: UserStore;
  passwordHasher?: PasswordHasher;
  tokenService?: TokenService;
  jwtSecret?: string;
  bcryptSaltRounds?: number;
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

export function createAuthRouter(options: AuthRouterOptions = {}) {
  const store = options.userStore ?? new InMemoryUserStore();
  const saltRounds = resolveSaltRounds(options.bcryptSaltRounds);
  const hasher = options.passwordHasher ?? createPasswordHasher(saltRounds);
  const secret = options.jwtSecret ?? process.env.JWT_SECRET ?? 'dev-secret';
  const tokens = options.tokenService ?? createTokenService(secret);
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
    const token = await tokens.createToken(user.id);

    return res.status(201).json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      token,
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

    const token = await tokens.createToken(user.id);
    return res.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      token,
    });
  });

  router.post('/logout', authMiddleware, (_req, res) => {
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
