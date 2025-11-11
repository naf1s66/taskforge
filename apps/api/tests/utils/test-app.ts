import request, { type SuperTest, type Test } from 'supertest';

import { InMemoryUserStore } from '../../src/auth/user-store';
import { createApp } from '../../src/app';
import type { TaskRepository } from '../../src/repositories/task-repository';
import { InMemoryTaskRepository } from './in-memory-task-repository';

export interface TestAgentContext {
  agent: SuperTest<Test>;
  userStore: InMemoryUserStore;
  taskRepository: TaskRepository;
}

export interface CreateTestAgentOptions {
  jwtSecret?: string;
  userStore?: InMemoryUserStore;
  sessionBridgeSecret?: string;
  taskRepository?: TaskRepository;
}

export function createTestAgent(
  options: CreateTestAgentOptions = {},
): TestAgentContext {
  const userStore = options.userStore ?? new InMemoryUserStore();
  const taskRepository = options.taskRepository ?? new InMemoryTaskRepository();
  const jwtSecret = options.jwtSecret ?? 'test-secret';
  const app = createApp({
    jwtSecret,
    userStore,
    sessionBridgeSecret: options.sessionBridgeSecret,
    taskRepository,
  });

  return { agent: request(app), userStore, taskRepository };
}
