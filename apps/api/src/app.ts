import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { PrismaUserStore, UserStore } from './auth/user-store';
import { openApiDocument } from './openapi';
import { createAuthRouter } from './routes/auth';
import { getPrismaClient } from './prisma';
import { router as tagRoutes } from './routes/tags';
import { router as taskRoutes } from './routes/tasks';

export interface CreateAppOptions {
  jwtSecret?: string;
  userStore?: UserStore;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ credentials: true })); // Allow credentials for cookies
  app.use(helmet());
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));

  app.get('/api/taskforge/v1/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/taskforge/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const userStore = options.userStore ?? new PrismaUserStore(getPrismaClient());
  const authRouterFactory = createAuthRouter({ jwtSecret: options.jwtSecret, userStore });
  app.use('/api/taskforge/v1/auth', authRouterFactory.router);

  app.use(authRouterFactory.authMiddleware);
  app.use('/api/taskforge/v1/tasks', taskRoutes);
  app.use('/api/taskforge/v1/tags', tagRoutes);
  app.get('/api/taskforge/v1/me', (_req, res) => {
    const user = res.locals.user as
      | { id: string; email: string; createdAt: string }
      | undefined;
    res.json({ user: user ?? null });
  });

  return app;
}
