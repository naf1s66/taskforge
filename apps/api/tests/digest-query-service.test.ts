import type { PrismaClient } from '@prisma/client';

import { DailyDigestQueryService, computeUtcWindowBoundaries } from '../src/notifications/digest-query-service';

function createTask(params: {
  id: string;
  userId?: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  updatedAt?: string;
  boardOrder?: number;
  tags?: string[];
}) {
  return {
    id: params.id,
    userId: params.userId ?? 'user-1',
    title: params.title,
    description: null,
    status: params.status,
    priority: params.priority ?? 'MEDIUM',
    boardOrder: params.boardOrder ?? 0,
    dueDate: params.dueDate ? new Date(params.dueDate) : null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date(params.updatedAt ?? '2026-05-19T10:00:00.000Z'),
    TaskTag: (params.tags ?? []).map((label, index) => ({
      taskId: params.id,
      tagId: `tag-${index}`,
      userId: params.userId ?? 'user-1',
      tag: {
        id: `tag-${index}`,
        userId: params.userId ?? 'user-1',
        label,
      },
    })),
  };
}

describe('DailyDigestQueryService', () => {
  it('returns deterministic user-scoped digest groups with compact task summaries', async () => {
    const findMany = jest.fn().mockResolvedValue([
      createTask({ id: 'a', title: 'Overdue task', status: 'TODO', dueDate: '2026-05-18T05:00:00.000Z', tags: ['z', 'a'] }),
      createTask({ id: 'b', title: 'Due today task', status: 'IN_PROGRESS', dueDate: '2026-05-19T20:00:00.000Z' }),
      createTask({ id: 'c', title: 'Due soon task', status: 'TODO', dueDate: '2026-05-21T12:00:00.000Z' }),
      createTask({ id: 'd', title: 'Recent task', status: 'IN_PROGRESS', dueDate: '2026-06-01T00:00:00.000Z', updatedAt: '2026-05-19T11:00:00.000Z' }),
      createTask({ id: 'e', title: 'Done task', status: 'DONE', dueDate: '2026-05-18T04:00:00.000Z', updatedAt: '2026-05-19T11:00:00.000Z' }),
    ]);

    const prisma = { task: { findMany } } as unknown as PrismaClient;
    const service = new DailyDigestQueryService(prisma);

    const digest = await service.queryForUser('user-1', {
      now: new Date('2026-05-19T12:00:00.000Z'),
      timezone: 'UTC',
      dueSoonDays: 3,
      recentlyUpdatedDays: 2,
      maxTasksPerGroup: 10,
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: { not: 'DONE' },
              dueDate: { lt: new Date('2026-05-23T00:00:00.000Z') },
            }),
            expect.objectContaining({
              status: { not: 'DONE' },
              updatedAt: { gte: new Date('2026-05-17T12:00:00.000Z') },
            }),
            { status: 'TODO' },
          ]),
        }),
        include: expect.any(Object),
      }),
    );

    expect(digest.totalTasksConsidered).toBe(5);
    expect(digest.groups.map(group => `${group.key}:${group.total}`)).toEqual([
      'overdue:1',
      'dueToday:1',
      'dueSoon:1',
      'recentlyUpdated:4',
      'blockedByStatus:2',
    ]);

    const overdue = digest.groups.find(group => group.key === 'overdue');
    expect(overdue?.tasks[0]).toEqual(
      expect.objectContaining({ id: 'a', title: 'Overdue task', tags: ['a', 'z'] }),
    );
    expect(overdue?.tasks[0]).not.toHaveProperty('description');

    const recentlyUpdated = digest.groups.find(group => group.key === 'recentlyUpdated');
    expect(recentlyUpdated?.tasks.map(task => task.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('returns empty groups for users without digest-worthy tasks', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { task: { findMany } } as unknown as PrismaClient;
    const service = new DailyDigestQueryService(prisma);

    const digest = await service.queryForUser('user-without-tasks', {
      now: new Date('2026-05-19T12:00:00.000Z'),
      timezone: 'America/New_York',
    });

    for (const group of digest.groups) {
      expect(group.total).toBe(0);
      expect(group.tasks).toEqual([]);
    }
  });

  it('computes timezone-aware daily boundaries', () => {
    const windows = computeUtcWindowBoundaries(
      new Date('2026-05-19T03:30:00.000Z'),
      'America/Los_Angeles',
      4,
      1,
    );

    expect(windows.startOfTodayUtc.toISOString()).toBe('2026-05-18T07:00:00.000Z');
    expect(windows.startOfTomorrowUtc.toISOString()).toBe('2026-05-19T07:00:00.000Z');
    expect(windows.dueSoonUntilUtc.toISOString()).toBe('2026-05-23T07:00:00.000Z');
    expect(windows.recentlyUpdatedSinceUtc.toISOString()).toBe('2026-05-18T03:30:00.000Z');
  });

  it('keeps local day windows aligned across daylight saving transitions', () => {
    const springForward = computeUtcWindowBoundaries(
      new Date('2026-03-08T12:00:00.000Z'),
      'America/Los_Angeles',
      1,
      1,
    );
    expect(springForward.startOfTodayUtc.toISOString()).toBe('2026-03-08T08:00:00.000Z');
    expect(springForward.startOfTomorrowUtc.toISOString()).toBe('2026-03-09T07:00:00.000Z');

    const fallBack = computeUtcWindowBoundaries(
      new Date('2026-11-01T12:00:00.000Z'),
      'America/Los_Angeles',
      1,
      1,
    );
    expect(fallBack.startOfTodayUtc.toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(fallBack.startOfTomorrowUtc.toISOString()).toBe('2026-11-02T08:00:00.000Z');
  });
});
