import request, { type SuperTest, type Test } from 'supertest';

import { PrismaUserStore, type UserStore } from '../../src/auth/user-store';
import { createApp, type CreateAppOptions } from '../../src/app';
import type { WelcomeEmailDeliveryDispatcher } from '../../src/notifications/welcome-email';
import { createTaskRepository, type TaskRepository } from '../../src/repositories/task-repository';
import type { EmailAdapter } from '../../src/email/types';
import { getTestPrisma, type PrismaClient } from './prisma';

export interface TestAgentContext {
  agent: SuperTest<Test>;
  prisma: PrismaClient;
  userStore: UserStore;
  taskRepository: TaskRepository;
}

export interface CreateTestAgentOptions {
  jwtSecret?: string;
  sessionBridgeSecret?: string;
  devBypassEnabled?: boolean;
  devBypassClientSecret?: string;
  userStore?: UserStore;
  taskRepository?: TaskRepository;
  welcomeEmailAdapter?: EmailAdapter;
  welcomeEmailDeliveryDispatcher?: WelcomeEmailDeliveryDispatcher;
  welcomeEmailPendingAttemptStaleAfterMs?: number;
  authRateLimit?: CreateAppOptions['authRateLimit'];
  digestJobSecret?: string;
  digestDailySendLimit?: number;
}

export function createTestAgent(options: CreateTestAgentOptions = {}): TestAgentContext {
  const prisma = getTestPrisma();
  const userStore = options.userStore ?? new PrismaUserStore(prisma);
  const taskRepository = options.taskRepository ?? createTaskRepository(prisma);
  const app = createApp({
    jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'test-secret',
    sessionBridgeSecret: options.sessionBridgeSecret ?? process.env.SESSION_BRIDGE_SECRET,
    devBypassEnabled: options.devBypassEnabled,
    devBypassClientSecret: options.devBypassClientSecret,
    userStore,
    taskRepository,
    welcomeEmailAdapter: options.welcomeEmailAdapter ?? { sendMail: async () => undefined },
    welcomeEmailDeliveryDispatcher: options.welcomeEmailDeliveryDispatcher ?? (task => task()),
    welcomeEmailPendingAttemptStaleAfterMs: options.welcomeEmailPendingAttemptStaleAfterMs,
    authRateLimit: options.authRateLimit,
    digestJobSecret: options.digestJobSecret,
    digestDailySendLimit: options.digestDailySendLimit,
  });

  return { agent: request(app), prisma, userStore, taskRepository };
}
