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
import { createTaskRouter } from './routes/tasks';
import { createTaskRepository, type TaskRepository } from './repositories/task-repository';

export interface CreateAppOptions {
  jwtSecret?: string;
  userStore?: UserStore;
  sessionBridgeSecret?: string;
  taskRepository?: TaskRepository;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  // Configure CORS to allow credentials with explicit origins
  app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Define allowed origins
      const allowedOrigins = [
        'http://localhost:3000',  // Web app in development
        'http://127.0.0.1:3000',  // Alternative localhost
        'https://taskforge.app',  // Production domain (if applicable)
      ];
      
      // Check if the origin is allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // For development, also allow any localhost origin
      if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      
      // Reject the request
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  }));
  app.use(helmet());
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));

  app.get('/api/taskforge/v1/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/taskforge/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const prisma = getPrismaClient();
  const userStore = options.userStore ?? new PrismaUserStore(prisma);
  const taskRepository = options.taskRepository ?? createTaskRepository(prisma);
  const authRouterFactory = createAuthRouter({
    jwtSecret: options.jwtSecret,
    userStore,
    sessionBridgeSecret: options.sessionBridgeSecret ?? process.env.SESSION_BRIDGE_SECRET,
  });
  app.use('/api/taskforge/v1/auth', authRouterFactory.router);

  app.use(authRouterFactory.authMiddleware);
  app.use('/api/taskforge/v1/tasks', createTaskRouter(taskRepository));
  app.use('/api/taskforge/v1/tags', tagRoutes);
  app.get('/api/taskforge/v1/me', (_req, res) => {
    const user = res.locals.user as
      | { id: string; email: string; createdAt: string }
      | undefined;
    res.json({ user: user ?? null });
  });

  return app;
}
