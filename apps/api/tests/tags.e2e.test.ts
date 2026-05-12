import { randomUUID } from 'node:crypto';

import { createTestAgent } from './utils/test-app';
import { registerTestUser } from './utils/auth';

describe('tags endpoints', () => {
  it('creates canonical tags and lists usage counts scoped to user', async () => {
    const { agent, prisma } = createTestAgent();

    const authA = await registerTestUser(agent, { email: `tags-a-${randomUUID()}@example.com` });
    const authB = await registerTestUser(agent, { email: `tags-b-${randomUUID()}@example.com` });

    const tokenA = authA.tokens.accessToken;
    const tokenB = authB.tokens.accessToken;
    const userA = authA.user;
    const userB = authB.user;

    const create = await agent
      .post('/api/taskforge/v1/tags')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ label: '  Work  ' })
      .expect(201);

    expect(create.body.label).toBe('work');

    await agent
      .post('/api/taskforge/v1/tags')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ label: 'WORK' })
      .expect(201);

    const otherUserTag = await agent
      .post('/api/taskforge/v1/tags')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ label: 'work' })
      .expect(201);

    const taskA = await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Task A',
      },
    });
    await prisma.taskTag.create({
      data: {
        taskId: taskA.id,
        tagId: create.body.id,
        userId: userA.id,
      },
    });

    const taskB = await prisma.task.create({
      data: {
        userId: userB.id,
        title: 'Task B',
      },
    });
    await prisma.taskTag.create({
      data: {
        taskId: taskB.id,
        tagId: otherUserTag.body.id,
        userId: userB.id,
      },
    });

    const listA = await agent
      .get('/api/taskforge/v1/tags')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(listA.body.items).toEqual([{ label: 'work', count: 1 }]);
  });

  it('rejects invalid tag labels consistently', async () => {
    const { agent } = createTestAgent();
    const auth = await registerTestUser(agent, { email: `tags-invalid-${randomUUID()}@example.com` });

    await agent
      .post('/api/taskforge/v1/tags')
      .set('Authorization', `Bearer ${auth.tokens.accessToken}`)
      .send({ label: ' '.repeat(4) })
      .expect(400);

    await agent
      .post('/api/taskforge/v1/tasks')
      .set('Authorization', `Bearer ${auth.tokens.accessToken}`)
      .send({ title: 'Task with invalid tag', tags: ['x'.repeat(65)] })
      .expect(400);
  });

  it('enforces task/tag user ownership at the database boundary', async () => {
    const { agent, prisma } = createTestAgent();

    const authA = await registerTestUser(agent, { email: `tags-owner-${randomUUID()}@example.com` });
    const authB = await registerTestUser(agent, { email: `tags-task-${randomUUID()}@example.com` });

    const tag = await prisma.tag.create({
      data: {
        userId: authA.user.id,
        label: 'owned',
      },
    });
    const task = await prisma.task.create({
      data: {
        userId: authB.user.id,
        title: 'Foreign tag attempt',
      },
    });

    await expect(
      prisma.taskTag.create({
        data: {
          taskId: task.id,
          tagId: tag.id,
          userId: authB.user.id,
        },
      }),
    ).rejects.toThrow();
  });
});
