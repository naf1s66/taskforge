import type { Request, Response, NextFunction } from 'express';

import type { TokenService } from '../auth/token';
import type { UserStore } from '../auth/user-store';

export interface AuthMiddlewareOptions {
  tokenService: TokenService;
  userStore: UserStore;
}

export function createAuthMiddleware({ tokenService, userStore }: AuthMiddlewareOptions) {
  return async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const payload = await tokenService.verifyToken(token);
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
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
