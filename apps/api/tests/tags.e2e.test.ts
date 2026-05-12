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

    await prisma.task.create({
      data: {
        userId: userA.id,
        title: 'Task A',
        TaskTag: { create: { tagId: create.body.id } },
      },
    });

    await prisma.task.create({
      data: {
        userId: userB.id,
        title: 'Task B',
        TaskTag: { create: { tagId: otherUserTag.body.id } },
      },
    });

    const listA = await agent
      .get('/api/taskforge/v1/tags')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(listA.body.items).toEqual([{ label: 'work', count: 1 }]);
  });
});
