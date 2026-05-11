import type { Request, Response, NextFunction } from 'express';

import { getSessionCookieName } from '@taskforge/shared';

import type { TokenService } from '../auth/token';
import type { UserStore } from '../auth/user-store';
import { verifyDevBypassClientToken } from '../auth/dev-bypass-client-token';

export interface AuthMiddlewareOptions {
  tokenService: TokenService;
  userStore: UserStore;
  devBypassEnabled?: boolean;
  devBypassClientSecret?: string;
}

export function createAuthMiddleware({
  tokenService,
  userStore,
  devBypassEnabled = false,
  devBypassClientSecret,
}: AuthMiddlewareOptions) {
  const sessionCookieName = getSessionCookieName();
  const devBypassHeaderName = 'x-taskforge-dev-bypass';

  async function authenticateWithDevBypassToken(token: string, res: Response, next: NextFunction) {
    if (!devBypassEnabled || !devBypassClientSecret) {
      return false;
    }

    try {
      const claims = verifyDevBypassClientToken(token, devBypassClientSecret);
      const user = await userStore.findById(claims.userId);
      if (!user) {
        return false;
      }

      res.locals.user = {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      };
      res.locals.token = token;
      next();
      return true;
    } catch {
      return false;
    }
  }

  return async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const devBypassToken = req.get(devBypassHeaderName);

    // Try to get token from HttpOnly cookie first, then fallback to Authorization header
    let token = req.cookies?.[sessionCookieName];

    if (!token) {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        token = header.slice('Bearer '.length).trim();
      }
    }

    if (!token) {
      if (devBypassToken && (await authenticateWithDevBypassToken(devBypassToken, res, next))) {
        return;
      }

      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const payload = await tokenService.verifyAccessToken(token);
      const user = await userStore.findById(payload.sub);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.locals.user = {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      };
      res.locals.token = token;
      return next();
    } catch {
      if (devBypassToken && (await authenticateWithDevBypassToken(devBypassToken, res, next))) {
        return;
      }

      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
