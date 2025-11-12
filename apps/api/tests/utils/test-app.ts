import request, { type SuperTest, type Test } from 'supertest';

import { PrismaUserStore, type UserStore } from '../../src/auth/user-store';
import { createApp } from '../../src/app';
import { createTaskRepository, type TaskRepository } from '../../src/repositories/task-repository';
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
  userStore?: UserStore;
  taskRepository?: TaskRepository;
}

export function createTestAgent(options: CreateTestAgentOptions = {}): TestAgentContext {
  const prisma = getTestPrisma();
  const userStore = options.userStore ?? new PrismaUserStore(prisma);
  const taskRepository = options.taskRepository ?? createTaskRepository(prisma);
  const app = createApp({
    jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'test-secret',
    sessionBridgeSecret: options.sessionBridgeSecret ?? process.env.SESSION_BRIDGE_SECRET,
    userStore,
    taskRepository,
  });

  return { agent: request(app), prisma, userStore, taskRepository };
}
