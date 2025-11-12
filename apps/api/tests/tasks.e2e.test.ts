import type { SuperTest, Test } from 'supertest';

import type { TaskRepository } from '../src/repositories/task-repository';

import { createTestAgent } from './utils/test-app';
import { extractSessionCookie, registerTestUser } from './utils/auth';
import { createTask, createUser, defaultPassword } from './utils/factories';

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
    const registered = await registerTestUser(agent, {
      email: 'tasks-user@example.com',
      password: defaultPassword,
    });

    return {
      accessToken: registered.tokens.accessToken,
      sessionCookie: extractSessionCookie(registered.cookies),
      userId: registered.user.id,
    };
  }

  function withAuth(request: Test, auth: { accessToken: string; sessionCookie?: string }) {
    let authed = request.set('Authorization', `Bearer ${auth.accessToken}`);
    if (auth.sessionCookie) {
      authed = authed.set('Cookie', auth.sessionCookie);
    }
    return authed;
  }

  describe('list', () => {
    it('returns paginated tasks for the authenticated user with metadata', async () => {
      const auth = await register();

      const first = await createTask({
        userId: auth.userId,
        title: 'Calibrate roadmap',
        description: 'Sync on upcoming milestones',
        status: 'TODO',
        priority: 'LOW',
        dueDate: '2024-01-05T09:00:00.000Z',
        tags: ['roadmap', 'planning'],
      });
      await sleep(5);
      const second = await createTask({
        userId: auth.userId,
        title: 'Publish release notes',
        description: 'Docs for the Q1 launch',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2024-01-15T17:00:00.000Z',
        tags: ['docs', 'release'],
      });
      await sleep(5);
      const third = await createTask({
        userId: auth.userId,
        title: 'Run retrospective',
        description: 'Team retro for the last sprint',
        status: 'DONE',
        priority: 'MEDIUM',
        dueDate: '2024-01-20T20:00:00.000Z',
        tags: ['retro', 'team'],
      });

      const outsider = await createUser({ email: 'outsider@example.com' });
      await createTask({
        userId: outsider.user.id,
        title: 'Should stay hidden',
        status: 'TODO',
        dueDate: '2024-01-07T12:00:00.000Z',
        tags: ['private'],
      });

      const response = await withAuth(
        agent.get('/api/taskforge/v1/tasks?page=1&pageSize=2'),
        auth,
      ).expect(200);

      expect(response.body).toEqual({
        page: 1,
        pageSize: 2,
        total: 3,
        items: [
          {
            id: third.task.id,
            title: 'Run retrospective',
            description: 'Team retro for the last sprint',
            status: 'DONE',
            priority: 'MEDIUM',
            dueDate: '2024-01-20T20:00:00.000Z',
            tags: ['retro', 'team'],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          {
            id: second.task.id,
            title: 'Publish release notes',
            description: 'Docs for the Q1 launch',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: '2024-01-15T17:00:00.000Z',
            tags: ['docs', 'release'],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ],
      });

      expect(new Date(response.body.items[0].createdAt).toISOString()).toBe(
        response.body.items[0].createdAt,
      );
      expect(new Date(response.body.items[0].updatedAt).getTime()).toBeGreaterThan(0);
      expect(new Date(response.body.items[1].createdAt).toISOString()).toBe(
        response.body.items[1].createdAt,
      );
      expect(new Date(response.body.items[1].updatedAt).getTime()).toBeGreaterThan(0);
      expect(
        response.body.items.find((item: { title: string }) => item.title === 'Should stay hidden'),
      ).toBeUndefined();

      const secondPage = await withAuth(
        agent.get('/api/taskforge/v1/tasks?page=2&pageSize=2'),
        auth,
      ).expect(200);

      expect(secondPage.body).toEqual({
        page: 2,
        pageSize: 2,
        total: 3,
        items: [
          expect.objectContaining({
            id: first.task.id,
            title: 'Calibrate roadmap',
            dueDate: '2024-01-05T09:00:00.000Z',
            tags: ['planning', 'roadmap'],
          }),
        ],
      });
    });

    it('requires authentication to list tasks', async () => {
      const response = await agent.get('/api/taskforge/v1/tasks').expect(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('supports filtering by status, priority, tag, search, and due date range', async () => {
      const auth = await register();

      await createTask({
        userId: auth.userId,
        title: 'Plan kickoff',
        description: 'Kickoff with stakeholders',
        status: 'TODO',
        priority: 'LOW',
        dueDate: '2024-01-01T10:00:00.000Z',
        tags: ['planning'],
      });

      const target = await createTask({
        userId: auth.userId,
        title: 'Publish release notes',
        description: 'Write docs for the Q1 release',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2024-01-10T10:00:00.000Z',
        tags: ['docs', 'release'],
      });

      await createTask({
        userId: auth.userId,
        title: 'File expenses',
        description: 'Submit reimbursements',
        status: 'DONE',
        priority: 'MEDIUM',
        tags: ['finance'],
      });

      const response = await withAuth(
        agent.get(
          '/api/taskforge/v1/tasks?page=1&pageSize=10&status=IN_PROGRESS&priority=HIGH&tag=docs&q=release&dueFrom=2024-01-05T00:00:00.000Z&dueTo=2024-01-15T23:59:59.999Z',
        ),
        auth,
      ).expect(200);

      expect(response.body).toEqual({
        page: 1,
        pageSize: 10,
        total: 1,
        items: [
          {
            id: target.task.id,
            title: 'Publish release notes',
            description: 'Write docs for the Q1 release',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: '2024-01-10T10:00:00.000Z',
            tags: ['docs', 'release'],
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ],
      });

      expect(
        response.body.items.every(
          (item: { status: string; priority: string; tags: string[]; title: string }) =>
            item.status === 'IN_PROGRESS' &&
            item.priority === 'HIGH' &&
            item.tags.includes('docs') &&
            item.title.toLowerCase().includes('release'),
        ),
      ).toBe(true);
    });

    it('rejects invalid due date ranges', async () => {
      const auth = await register();

      const response = await withAuth(
        agent.get(
          '/api/taskforge/v1/tasks?dueFrom=2025-01-10T00:00:00.000Z&dueTo=2025-01-01T00:00:00.000Z',
        ),
        auth,
      ).expect(400);

      expect(response.body).toEqual(expect.objectContaining({ error: 'Invalid payload' }));
    });

    it('validates pagination parameters', async () => {
      const auth = await register();

      const response = await withAuth(
        agent.get('/api/taskforge/v1/tasks?page=0&pageSize=-1'),
        auth,
      ).expect(400);

      expect(response.body).toEqual(expect.objectContaining({ error: 'Invalid payload' }));
    });
  });

  describe('create', () => {
    it('creates a task with defaults and returns the persisted record', async () => {
      const auth = await register();

      const createResponse = await withAuth(
        agent.post('/api/taskforge/v1/tasks').send({
          title: 'Write API docs',
          description: 'Outline request/response examples',
          priority: 'HIGH',
          tags: [' docs  ', 'api', 'work'],
          dueDate: '2024-03-01T09:30:00.000Z',
        }),
        auth,
      ).expect(201);

      expect(createResponse.body).toEqual({
        id: expect.any(String),
        title: 'Write API docs',
        description: 'Outline request/response examples',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: '2024-03-01T09:30:00.000Z',
        tags: ['api', 'docs', 'work'],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      expect(new Date(createResponse.body.createdAt).toISOString()).toBe(
        createResponse.body.createdAt,
      );
      expect(new Date(createResponse.body.updatedAt).getTime()).toBeGreaterThan(0);

      const stored = await taskRepository.listTasks(auth.userId, { pageSize: 10 });
      expect(stored.total).toBe(1);
      expect(stored.items[0]).toMatchObject({
        id: createResponse.body.id,
        title: 'Write API docs',
        priority: 'HIGH',
        dueDate: '2024-03-01T09:30:00.000Z',
        tags: ['api', 'docs', 'work'],
      });
    });

    it('rejects invalid payloads with the standard error envelope', async () => {
      const auth = await register();

      const response = await withAuth(
        agent.post('/api/taskforge/v1/tasks').send({ title: '  ' }),
        auth,
      ).expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: 'Invalid payload',
          details: expect.any(Object),
        }),
      );
    });

    it('requires authentication to create tasks', async () => {
      const response = await agent
        .post('/api/taskforge/v1/tasks')
        .send({ title: 'Unauthenticated task' })
        .expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('update', () => {
    it('updates a task and returns the fresh record with propagated tags', async () => {
      const auth = await register();
      const created = await createTask({
        userId: auth.userId,
        title: 'Draft proposal',
        description: 'Initial outline',
        status: 'TODO',
        priority: 'LOW',
        dueDate: '2024-04-01T12:00:00.000Z',
        tags: ['initial'],
      });

      await sleep(10);

      const response = await withAuth(
        agent.patch(`/api/taskforge/v1/tasks/${created.task.id}`).send({
          title: 'Draft proposal v2',
          description: 'Expanded with metrics',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: '2024-04-05T15:00:00.000Z',
          tags: ['planning', 'proposal'],
        }),
        auth,
      ).expect(200);

      expect(response.body).toEqual({
        id: created.task.id,
        title: 'Draft proposal v2',
        description: 'Expanded with metrics',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2024-04-05T15:00:00.000Z',
        tags: ['planning', 'proposal'],
        createdAt: created.task.createdAt,
        updatedAt: expect.any(String),
      });

      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.task.updatedAt).getTime(),
      );

      const refreshed = await taskRepository.listTasks(auth.userId);
      expect(refreshed.total).toBe(1);
      expect(refreshed.items[0]).toMatchObject({
        id: created.task.id,
        title: 'Draft proposal v2',
        description: 'Expanded with metrics',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2024-04-05T15:00:00.000Z',
        tags: ['planning', 'proposal'],
      });
      expect(refreshed.items[0].tags).not.toContain('initial');
    });

    it('returns 400 when updating with an invalid task id', async () => {
      const auth = await register();

      const response = await withAuth(
        agent.patch('/api/taskforge/v1/tasks/not-a-uuid').send({ title: 'Renamed' }),
        auth,
      ).expect(400);

      expect(response.body).toEqual({ error: 'Invalid identifier' });
    });

    it('returns validation errors for malformed updates', async () => {
      const auth = await register();
      const created = await createTask({ userId: auth.userId, title: 'Fix lint' });

      const response = await withAuth(
        agent.patch(`/api/taskforge/v1/tasks/${created.task.id}`).send({ dueDate: 'not-a-date' }),
        auth,
      ).expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({ error: 'Invalid payload', details: expect.any(Object) }),
      );
    });

    it('requires authentication to update tasks', async () => {
      const created = await createTask({ title: 'Hidden task' });

      const response = await agent
        .patch(`/api/taskforge/v1/tasks/${created.task.id}`)
        .send({ title: 'Blocked' })
        .expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it("returns 404 when attempting to update another user's task", async () => {
      const auth = await register();
      const someoneElse = await createUser({ email: 'someone-else@example.com' });
      const foreignTask = await createTask({ userId: someoneElse.user.id, title: 'Secret task' });

      const response = await withAuth(
        agent.patch(`/api/taskforge/v1/tasks/${foreignTask.task.id}`).send({ title: 'Hacked' }),
        auth,
      ).expect(404);

      expect(response.body).toEqual({ error: 'Not found' });
    });
  });

  describe('delete', () => {
    it('deletes a task and returns a confirmation payload', async () => {
      const auth = await register();
      const created = await createTask({
        userId: auth.userId,
        title: 'Archive me',
        tags: ['cleanup'],
      });

      const response = await withAuth(
        agent.delete(`/api/taskforge/v1/tasks/${created.task.id}`),
        auth,
      ).expect(200);

      expect(response.body).toEqual({ id: created.task.id, status: 'deleted' });

      const remaining = await taskRepository.listTasks(auth.userId);
      expect(remaining.total).toBe(0);
    });

    it('returns 400 when deleting with an invalid task id', async () => {
      const auth = await register();

      const response = await withAuth(
        agent.delete('/api/taskforge/v1/tasks/not-a-uuid'),
        auth,
      ).expect(400);

      expect(response.body).toEqual({ error: 'Invalid identifier' });
    });

    it('requires authentication to delete tasks', async () => {
      const created = await createTask({ title: 'Do not remove' });

      const response = await agent
        .delete(`/api/taskforge/v1/tasks/${created.task.id}`)
        .expect(401);

      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it("returns 404 when attempting to delete another user's task", async () => {
      const auth = await register();
      const someoneElse = await createUser({ email: 'delete-other@example.com' });
      const foreignTask = await createTask({ userId: someoneElse.user.id, title: 'Keep out' });

      const response = await withAuth(
        agent.delete(`/api/taskforge/v1/tasks/${foreignTask.task.id}`),
        auth,
      ).expect(404);

      expect(response.body).toEqual({ error: 'Not found' });
    });
  });
});
