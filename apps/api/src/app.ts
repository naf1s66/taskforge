import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
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
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

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

  app.use(authRouterFactory.authMiddleware);
  app.use('/api/taskforge/v1/tasks', createTaskRouter(taskRepository));
  app.use('/api/taskforge/v1/tags', tagRoutes);
  const digestEmailAdapter = options.digestEmailAdapter ?? options.welcomeEmailAdapter;
  const emailDigestRunner = new DailyDigestRunner({
    prisma: getOrCreatePrisma(),
    emailAdapter: digestEmailAdapter ?? { sendMail: () => Promise.resolve() },
  });
  app.use(
    '/api/taskforge/v1/email/digest',
    createEmailDigestRouter(getOrCreatePrisma(), {
      defaultSendLimit: options.digestDailySendLimit ?? 90,
      digestRunner: emailDigestRunner,
      sendConfigured: Boolean(digestEmailAdapter),
    }),
  );
  app.get('/api/taskforge/v1/me', async (_req, res, next) => {
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
  app.patch('/api/taskforge/v1/me/email-preferences', async (req, res, next) => {
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

  return app;
}
