import request, { type SuperTest, type Test } from 'supertest';

import { InMemoryUserStore } from '../../src/auth/user-store';
import { createApp } from '../../src/app';

export interface TestAgentContext {
  agent: SuperTest<Test>;
  userStore: InMemoryUserStore;
}

export interface CreateTestAgentOptions {
  jwtSecret?: string;
  userStore?: InMemoryUserStore;
}

export function createTestAgent(
  options: CreateTestAgentOptions = {},
): TestAgentContext {
  const userStore = options.userStore ?? new InMemoryUserStore();
  const jwtSecret = options.jwtSecret ?? 'test-secret';
  const app = createApp({ jwtSecret, userStore });

  return { agent: request(app), userStore };
}
