import { describe, expect, it } from 'vitest';

import type { TaskBoardResponse } from './tasks-client';
import { __testing } from './tasks-hooks';

const board: TaskBoardResponse = {
  columns: [
    {
      status: 'TODO',
      title: 'To Do',
      order: 1,
      tasks: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Draft contract',
          status: 'TODO',
          priority: 'HIGH',
          position: 0,
          dueDate: '2024-06-01T00:00:00.000Z',
          tags: ['api'],
          updatedAt: '2024-05-01T00:00:00.000Z',
        },
      ],
      total: 1,
      overdueCount: 1,
      tags: [{ label: 'api', count: 1 }],
    },
    {
      status: 'IN_PROGRESS',
      title: 'In Progress',
      order: 2,
      tasks: [],
      total: 0,
      overdueCount: 0,
      tags: [],
    },
    {
      status: 'DONE',
      title: 'Done',
      order: 3,
      tasks: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Ship release notes',
          status: 'DONE',
          priority: 'LOW',
          position: 0,
          dueDate: '2024-05-20T00:00:00.000Z',
          tags: ['docs'],
          updatedAt: '2024-05-02T00:00:00.000Z',
        },
      ],
      total: 1,
      overdueCount: 0,
      tags: [{ label: 'docs', count: 1 }],
    },
  ],
  summary: {
    totalsByStatus: {
      TODO: 1,
      IN_PROGRESS: 0,
      DONE: 1,
    },
    overdueByStatus: {
      TODO: 1,
      IN_PROGRESS: 0,
      DONE: 0,
    },
    totalTasks: 2,
    totalOverdue: 1,
  },
  updatedAt: '2024-05-02T00:00:00.000Z',
  generatedAt: '2024-05-02T00:00:00.000Z',
};

describe('tasks-hooks board cache helpers', () => {
  it('applies task edits to the board cache and recomputes lane metadata', () => {
    const now = new Date('2024-06-15T00:00:00.000Z');

    const updated = __testing.applyTaskUpdateToBoard(
      board,
      '11111111-1111-4111-8111-111111111111',
      {
        title: 'Finalize contract',
        status: 'DONE',
        priority: 'MEDIUM',
        dueDate: undefined,
        tags: ['contracts', 'legal'],
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
      now,
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 0,
      overdueCount: 0,
      tags: [],
      tasks: [],
    });

    expect(updated.columns[2]).toMatchObject({
      status: 'DONE',
      total: 2,
      overdueCount: 0,
      tags: [
        { label: 'contracts', count: 1 },
        { label: 'docs', count: 1 },
        { label: 'legal', count: 1 },
      ],
    });
    expect(updated.columns[2].tasks).toEqual([
      {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Ship release notes',
        status: 'DONE',
        priority: 'LOW',
        position: 0,
        dueDate: '2024-05-20T00:00:00.000Z',
        tags: ['docs'],
        updatedAt: '2024-05-02T00:00:00.000Z',
      },
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Finalize contract',
        status: 'DONE',
        priority: 'MEDIUM',
        position: 1,
        dueDate: undefined,
        tags: ['contracts', 'legal'],
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
    ]);

    expect(updated.summary).toEqual({
      totalsByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 2,
      },
      overdueByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
      totalTasks: 2,
      totalOverdue: 0,
    });
    expect(updated.updatedAt).toBe('2024-06-15T12:00:00.000Z');
    expect(updated.generatedAt).toBe('2024-05-02T00:00:00.000Z');
  });
});
