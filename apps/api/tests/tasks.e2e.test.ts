import type { SuperTest, Test } from 'supertest';

import type { TaskRepository } from '../src/repositories/task-repository';

import { createTestAgent } from './utils/test-app';
import { registerTestUser } from './utils/auth';
import { createUser, defaultPassword } from './utils/factories';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Tasks API', () => {
  let agent: SuperTest<Test>;
  let taskRepository: TaskRepository;

  beforeEach(() => {
    const context = createTestAgent({ sessionBridgeSecret: 'test-bridge-secret' });
    agent = context.agent;
    taskRepository = context.taskRepository;
  });

  async function register() {
    const registered = await registerTestUser(agent, { email: 'tasks-user@example.com', password: defaultPassword });
    return {
      accessToken: registered.tokens.accessToken,
      userId: registered.user.id,
    };
  }

  it('returns paginated tasks for the authenticated user', async () => {
    const { accessToken, userId } = await register();

    await taskRepository.createTask(userId, { title: 'First' });
    await sleep(2);
    await taskRepository.createTask(userId, { title: 'Second' });
    await sleep(2);
    await taskRepository.createTask(userId, { title: 'Third' });

    const other = await createUser({ email: 'other-user@example.com' });
    await taskRepository.createTask(other.user.id, { title: 'Should not appear' });

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

  it('supports filtering by status, priority, tag, search, and due date range', async () => {
    const { accessToken, userId } = await register();

    const earlyDue = new Date('2024-01-01T10:00:00.000Z');
    const targetDue = new Date('2024-01-10T10:00:00.000Z');

    await taskRepository.createTask(userId, {
      title: 'Plan kickoff',
      description: 'Kickoff with stakeholders',
      status: 'TODO',
      priority: 'LOW',
      dueDate: earlyDue.toISOString(),
      tags: ['planning'],
    });

    await taskRepository.createTask(userId, {
      title: 'Publish release notes',
      description: 'Write docs for the Q1 release',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: targetDue.toISOString(),
      tags: ['docs', 'release'],
    });

    await taskRepository.createTask(userId, {
      title: 'File expenses',
      description: 'Submit reimbursements',
      status: 'DONE',
      priority: 'MEDIUM',
      tags: ['finance'],
    });

    const response = await agent
      .get(
        '/api/taskforge/v1/tasks?page=1&pageSize=10&status=IN_PROGRESS&priority=HIGH&tag=docs&q=release&dueFrom=2024-01-05T00:00:00.000Z&dueTo=2024-01-15T23:59:59.999Z',
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        total: 1,
        items: [
          expect.objectContaining({
            title: 'Publish release notes',
            tags: ['docs', 'release'],
            status: 'IN_PROGRESS',
            priority: 'HIGH',
          }),
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

  it('returns 400 when updating with an invalid task id', async () => {
    const { accessToken } = await register();

    const response = await agent
      .patch('/api/taskforge/v1/tasks/not-a-uuid')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Renamed' })
      .expect(400);

    expect(response.body).toEqual({ error: 'Invalid identifier' });
  });

  it("returns 404 when attempting to update another user's task", async () => {
    const { accessToken } = await register();
    const someoneElse = await createUser({ email: 'someone-else@example.com' });
    const foreignTask = await taskRepository.createTask(someoneElse.user.id, { title: 'Secret task' });

    await agent
      .patch(`/api/taskforge/v1/tasks/${foreignTask.id}`)
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

  it('returns 400 when deleting with an invalid task id', async () => {
    const { accessToken } = await register();

    const response = await agent
      .delete('/api/taskforge/v1/tasks/not-a-uuid')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(response.body).toEqual({ error: 'Invalid identifier' });
  });

  it("returns 404 when attempting to delete another user's task", async () => {
    const { accessToken } = await register();
    const someoneElse = await createUser({ email: 'delete-other@example.com' });
    const foreignTask = await taskRepository.createTask(someoneElse.user.id, { title: 'Keep out' });

    await agent
      .delete(`/api/taskforge/v1/tasks/${foreignTask.id}`)
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

  it('rejects invalid due date ranges', async () => {
    const { accessToken } = await register();

    const response = await agent
      .get(
        '/api/taskforge/v1/tasks?dueFrom=2025-01-10T00:00:00.000Z&dueTo=2025-01-01T00:00:00.000Z',
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(response.body).toEqual(expect.objectContaining({ error: 'Invalid payload' }));
  });
});
