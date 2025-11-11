import { randomUUID } from 'node:crypto';

import type { SuperTest, Test } from 'supertest';

import { InMemoryUserStore } from '../src/auth/user-store';
import { type TaskRepository } from '../src/repositories/task-repository';
import { createTestAgent } from './utils/test-app';

const defaultPassword = 'Secret123!';

function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Tasks API', () => {
  let agent: SuperTest<Test>;
  let userStore: InMemoryUserStore;
  let taskRepository: TaskRepository;

  beforeEach(() => {
    const context = createTestAgent({ sessionBridgeSecret: 'test-bridge-secret' });
    agent = context.agent;
    userStore = context.userStore;
    taskRepository = context.taskRepository;
  });

  afterEach(async () => {
    await userStore.clear();
  });

  async function register() {
    const email = uniqueEmail('tasks');
    const response = await agent
      .post('/api/taskforge/v1/auth/register')
      .send({ email, password: defaultPassword })
      .expect(201);

    return {
      email,
      accessToken: response.body.tokens.accessToken as string,
      userId: response.body.user.id as string,
    };
  }

  it('returns paginated tasks for the authenticated user', async () => {
    const { accessToken, userId } = await register();

    await taskRepository.createTask(userId, { title: 'First' });
    await sleep(2);
    await taskRepository.createTask(userId, { title: 'Second' });
    await sleep(2);
    await taskRepository.createTask(userId, { title: 'Third' });
    await taskRepository.createTask('someone-else', { title: 'Should not appear' });

    const response = await agent
      .get('/api/taskforge/v1/tasks?page=1&pageSize=2')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 2,
        total: 3,
        items: [
          expect.objectContaining({ title: 'Third' }),
          expect.objectContaining({ title: 'Second' }),
        ],
      }),
    );
  });

  it('creates a task with defaults and returns the record', async () => {
    const { accessToken } = await register();

    const createResponse = await agent
      .post('/api/taskforge/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Write docs', tags: ['docs', 'work'] })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: 'Write docs',
        status: 'TODO',
        priority: 'MEDIUM',
        tags: ['docs', 'work'],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it('rejects invalid payloads with the standard error envelope', async () => {
    const { accessToken } = await register();

    const response = await agent
      .post('/api/taskforge/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '  ' })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        error: 'Invalid payload',
        details: expect.any(Object),
      }),
    );
  });

  it('validates pagination parameters', async () => {
    const { accessToken } = await register();

    const response = await agent
      .get('/api/taskforge/v1/tasks?page=0&pageSize=-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({ error: 'Invalid payload' }),
    );
  });
});
