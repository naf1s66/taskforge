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

  it('updates a task and returns the fresh record', async () => {
    const { accessToken, userId } = await register();
    const created = await taskRepository.createTask(userId, {
      title: 'Draft proposal',
      status: 'TODO',
      tags: ['initial'],
    });

    await sleep(10);

    const response = await agent
      .patch(`/api/taskforge/v1/tasks/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'IN_PROGRESS', tags: ['planning', 'proposal'] })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: created.id,
        status: 'IN_PROGRESS',
        title: 'Draft proposal',
        tags: ['planning', 'proposal'],
        updatedAt: expect.any(String),
      }),
    );

    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime(),
    );
  });

  it("returns 404 when attempting to update another user's task", async () => {
    const { accessToken } = await register();
    const someoneElse = await taskRepository.createTask('another-user', { title: 'Secret task' });

    await agent
      .patch(`/api/taskforge/v1/tasks/${someoneElse.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Hacked' })
      .expect(404);
  });

  it('returns validation errors for malformed updates', async () => {
    const { accessToken, userId } = await register();
    const created = await taskRepository.createTask(userId, { title: 'Fix lint' });

    const response = await agent
      .patch(`/api/taskforge/v1/tasks/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dueDate: 'not-a-date' })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        error: 'Invalid payload',
        details: expect.any(Object),
      }),
    );
  });

  it('deletes a task and returns a confirmation payload', async () => {
    const { accessToken, userId } = await register();
    const created = await taskRepository.createTask(userId, { title: 'Archive me' });

    const response = await agent
      .delete(`/api/taskforge/v1/tasks/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ id: created.id, status: 'deleted' });

    const remaining = await taskRepository.listTasks(userId);
    expect(remaining.total).toBe(0);
  });

  it("returns 404 when attempting to delete another user's task", async () => {
    const { accessToken } = await register();
    const someoneElse = await taskRepository.createTask('another-user', { title: 'Keep out' });

    await agent
      .delete(`/api/taskforge/v1/tasks/${someoneElse.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
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
