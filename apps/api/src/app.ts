import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';

import { PrismaUserStore, UserStore } from './auth/user-store';
import { openApiDocument } from './openapi';
import { createAuthRouter } from './routes/auth';
import { getPrismaClient } from './prisma';
import { router as tagRoutes } from './routes/tags';
import { createTaskRouter } from './routes/tasks';
import { createTaskRepository, type TaskRepository } from './repositories/task-repository';
import { WelcomeEmailService, type WelcomeEmailDeliveryDispatcher } from './notifications/welcome-email';
import type { EmailAdapter } from './email/types';
import { DailyDigestRunner } from './notifications/daily-digest-runner';
import { createJobsRouter } from './routes/jobs';
import { createEmailDigestRouter } from './routes/email-digest';
import { getHttpServerConfig } from './config/http';

const CORS_ERROR_CODE = 'CORS_ORIGIN_DENIED';

function isValidBrowserOriginHeader(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.pathname === '/' &&
      !parsed.search &&
      !parsed.hash &&
      parsed.origin === origin
    );
  } catch {
    return false;
  }
}

function createCorsError(message: string): Error {
  const error = new Error(message);
  Object.assign(error, { status: 403, code: CORS_ERROR_CODE });
  return error;
}

interface HttpErrorShape {
  status?: unknown;
  code?: unknown;
}

function getHttpErrorShape(error: unknown): HttpErrorShape {
  return error && typeof error === 'object' ? error as HttpErrorShape : {};
}

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const errorShape = getHttpErrorShape(error);
  const status = typeof errorShape.status === 'number' && errorShape.status >= 400 && errorShape.status < 600
    ? errorShape.status
    : 500;
  const isCorsError = errorShape.code === CORS_ERROR_CODE;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error instanceof Error
      ? error.message
      : 'Internal server error';

  res.status(status).json({ error: isCorsError ? 'CORS origin denied' : message });
};

const EmailPreferenceUpdateSchema = z.object({
  dailyDigestEnabled: z.boolean(),
}).strict();

export interface CreateAppOptions {
  jwtSecret?: string;
  userStore?: UserStore;
  sessionBridgeSecret?: string;
  devBypassEnabled?: boolean;
  devBypassClientSecret?: string;
  taskRepository?: TaskRepository;
  welcomeEmailAdapter?: EmailAdapter;
  welcomeEmailDeliveryDispatcher?: WelcomeEmailDeliveryDispatcher;
  welcomeEmailPendingAttemptStaleAfterMs?: number;
  digestEmailAdapter?: EmailAdapter;
  digestJobSecret?: string;
  digestDailySendLimit?: number;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const httpConfig = getHttpServerConfig();
  if (httpConfig.trustProxy !== undefined) {
    app.set('trust proxy', httpConfig.trustProxy);
  }
  const allowedCorsOrigins = httpConfig.corsAllowedOrigins;

  app.use(express.json());
  app.use(cookieParser());
  app.use(helmet());
  // Configure CORS to allow credentials with explicit origins
  app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
      // Preserve non-browser clients such as curl, health checks, and server-to-server calls.
      if (!origin) return callback(null, true);

      if (!isValidBrowserOriginHeader(origin)) {
        return callback(createCorsError('Malformed Origin header.'), false);
      }

      if (allowedCorsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(createCorsError('Origin is not allowed by CORS policy.'), false);
    },
  }));
  app.use(rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
  }));

  app.get('/api/taskforge/v1/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/taskforge/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  let prisma: ReturnType<typeof getPrismaClient> | undefined;
  const getOrCreatePrisma = (): ReturnType<typeof getPrismaClient> => {
    if (!prisma) {
      prisma = getPrismaClient();
    }
    return prisma;
  };

  const userStore = options.userStore ?? new PrismaUserStore(getOrCreatePrisma());
  const taskRepository = options.taskRepository ?? createTaskRepository(getOrCreatePrisma());
  const welcomeEmailService = new WelcomeEmailService({
    prisma: getOrCreatePrisma(),
    emailAdapter: options.welcomeEmailAdapter,
    deliveryDispatcher: options.welcomeEmailDeliveryDispatcher,
    pendingAttemptStaleAfterMs: options.welcomeEmailPendingAttemptStaleAfterMs,
  });
  const authRouterFactory = createAuthRouter({
    jwtSecret: options.jwtSecret,
    userStore,
    sessionBridgeSecret: options.sessionBridgeSecret ?? process.env.SESSION_BRIDGE_SECRET,
    devBypassEnabled: options.devBypassEnabled,
    devBypassClientSecret: options.devBypassClientSecret,
    welcomeEmailService,
  });
  app.use('/api/taskforge/v1/auth', authRouterFactory.router);

  const digestJobSecret = options.digestJobSecret ?? process.env.DIGEST_JOB_SECRET;
  if (digestJobSecret) {
    const digestEmailAdapter = options.digestEmailAdapter ?? options.welcomeEmailAdapter;
    if (!digestEmailAdapter) {
      throw new Error('digestEmailAdapter or welcomeEmailAdapter must be configured before enabling digest jobs.');
    }

    const digestRunner = new DailyDigestRunner({
      prisma: getOrCreatePrisma(),
      emailAdapter: digestEmailAdapter,
    });

    app.use(
      '/api/taskforge/v1/jobs',
      createJobsRouter(digestRunner, {
        defaultSendLimit: options.digestDailySendLimit ?? 90,
        secret: digestJobSecret,
      }),
    );
  }

  const protectedRouter = express.Router();
  protectedRouter.use('/tasks', authRouterFactory.authMiddleware, createTaskRouter(taskRepository));
  protectedRouter.use('/tags', authRouterFactory.authMiddleware, tagRoutes);
  const digestEmailAdapter = options.digestEmailAdapter ?? options.welcomeEmailAdapter;
  const emailDigestRunner = new DailyDigestRunner({
    prisma: getOrCreatePrisma(),
    emailAdapter: digestEmailAdapter ?? { sendMail: () => Promise.resolve() },
  });
  protectedRouter.use(
    '/email/digest',
    authRouterFactory.authMiddleware,
    createEmailDigestRouter(getOrCreatePrisma(), {
      defaultSendLimit: options.digestDailySendLimit ?? 90,
      digestRunner: emailDigestRunner,
      sendConfigured: Boolean(digestEmailAdapter),
    }),
  );
  protectedRouter.get('/me', authRouterFactory.authMiddleware, async (_req, res, next) => {
    const user = res.locals.user as
      | { id: string; email: string; createdAt: string }
      | undefined;
    if (!user) {
      return res.json({ user: null });
    }

    try {
      const preference = await getOrCreatePrisma().emailPreference.findUnique({
        where: { userId: user.id },
        select: { dailyDigestEnabled: true, dailyDigestTimezone: true },
      });

      return res.json({
        user,
        emailPreference: {
          dailyDigestEnabled: preference?.dailyDigestEnabled ?? false,
          dailyDigestTimezone: preference?.dailyDigestTimezone ?? 'UTC',
        },
      });
    } catch (error) {
      return next(error);
    }
  });
  protectedRouter.patch('/me/email-preferences', authRouterFactory.authMiddleware, async (req, res, next) => {
    const user = res.locals.user as { id: string } | undefined;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = EmailPreferenceUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    try {
      const preference = await getOrCreatePrisma().emailPreference.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          dailyDigestEnabled: parsed.data.dailyDigestEnabled,
        },
        update: { dailyDigestEnabled: parsed.data.dailyDigestEnabled },
        select: { dailyDigestEnabled: true, dailyDigestTimezone: true },
      });

      return res.json({ emailPreference: preference });
    } catch (error) {
      return next(error);
    }
  });

  app.use('/api/taskforge/v1', protectedRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);

  return app;
}
