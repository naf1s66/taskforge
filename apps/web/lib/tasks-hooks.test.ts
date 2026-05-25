import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { TaskBoardResponse } from './tasks-client';
import type { TaskListData, TaskListItem } from './tasks-hooks';
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
  it('invalidates the digest preview cache for task-derived read model changes', () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    __testing.invalidateDigestPreview(queryClient, 'user-1');

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['email-digest-preview', 'user-1'],
    });
  });

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

  it('removes a task from a filtered board cache when an edit no longer matches', () => {
    const updated = __testing.applyTaskUpdateToBoard(
      board,
      '11111111-1111-4111-8111-111111111111',
      {
        tags: ['docs'],
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
      new Date('2024-06-15T00:00:00.000Z'),
      { tag: ['api'] },
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 0,
      overdueCount: 0,
      tags: [],
      tasks: [],
    });
    expect(updated.summary).toEqual({
      totalsByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 1,
      },
      overdueByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
      totalTasks: 1,
      totalOverdue: 0,
    });
  });

  it('matches board tag filters case-insensitively during optimistic edits', () => {
    const updated = __testing.applyTaskUpdateToBoard(
      board,
      '11111111-1111-4111-8111-111111111111',
      {
        title: 'Finalize contract',
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
      new Date('2024-06-15T00:00:00.000Z'),
      { tag: ['API'] },
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 1,
    });
    expect(updated.columns[0].tasks[0]).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Finalize contract',
      tags: ['api'],
    });
  });

  it('removes a task from a filtered board cache when non-tag filters no longer match', () => {
    const updated = __testing.applyTaskUpdateToBoard(
      board,
      '11111111-1111-4111-8111-111111111111',
      {
        priority: 'LOW',
        dueDate: '2024-07-01T00:00:00.000Z',
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
      new Date('2024-06-15T00:00:00.000Z'),
      {
        status: 'TODO',
        priority: 'HIGH',
        dueTo: '2024-06-30T23:59:59.999Z',
      },
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 0,
      tasks: [],
    });
    expect(updated.summary.totalTasks).toBe(1);
  });

  it('keeps partial board tasks in search-filtered caches when description is not loaded', () => {
    const updated = __testing.applyTaskUpdateToBoard(
      board,
      '11111111-1111-4111-8111-111111111111',
      {
        priority: 'HIGH',
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
      new Date('2024-06-15T00:00:00.000Z'),
      { q: 'description-only phrase' },
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 1,
    });
    expect(updated.columns[0].tasks[0]).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      priority: 'HIGH',
    });
  });

  it('continues checking due filters after a board task title matches search', () => {
    const updated = __testing.applyTaskUpdateToBoard(
      board,
      '11111111-1111-4111-8111-111111111111',
      {
        title: 'Draft contract',
        dueDate: '2024-07-01T00:00:00.000Z',
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
      new Date('2024-06-15T00:00:00.000Z'),
      {
        q: 'draft',
        dueTo: '2024-06-30T23:59:59.999Z',
      },
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 0,
      tasks: [],
    });
  });

  it('reconciles server tasks into board caches when search filters match descriptions', () => {
    const emptyBoard: TaskBoardResponse = {
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        tasks: [],
        total: 0,
        overdueCount: 0,
        tags: [],
      })),
      summary: {
        totalsByStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          DONE: 0,
        },
        overdueByStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          DONE: 0,
        },
        totalTasks: 0,
        totalOverdue: 0,
      },
    };
    const task: TaskListItem = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Draft contract',
      description: 'Contains the board-search phrase',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: '2024-06-01T00:00:00.000Z',
      tags: ['api'],
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-06-15T12:00:00.000Z',
    };

    const updated = __testing.reconcileTaskInBoard(
      emptyBoard,
      task,
      { q: 'board-search' },
      new Date('2024-06-15T00:00:00.000Z'),
    );

    expect(updated.columns[0].tasks).toHaveLength(1);
    expect(updated.summary.totalTasks).toBe(1);
  });

  it('matches board tag filters case-insensitively when reconciling server tasks', () => {
    const emptyBoard: TaskBoardResponse = {
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        tasks: [],
        total: 0,
        overdueCount: 0,
        tags: [],
      })),
      summary: {
        totalsByStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          DONE: 0,
        },
        overdueByStatus: {
          TODO: 0,
          IN_PROGRESS: 0,
          DONE: 0,
        },
        totalTasks: 0,
        totalOverdue: 0,
      },
    };
    const task: TaskListItem = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Draft contract',
      description: 'Matches a mixed-case URL tag filter',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: '2024-06-01T00:00:00.000Z',
      tags: ['api'],
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-06-15T12:00:00.000Z',
    };

    const updated = __testing.reconcileTaskInBoard(
      emptyBoard,
      task,
      { tag: ['API'] },
      new Date('2024-06-15T00:00:00.000Z'),
    );

    expect(updated.columns[0].tasks).toEqual([
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Draft contract',
        status: 'TODO',
        priority: 'HIGH',
        position: 0,
        dueDate: '2024-06-01T00:00:00.000Z',
        tags: ['api'],
        updatedAt: '2024-06-15T12:00:00.000Z',
      },
    ]);
    expect(updated.summary.totalTasks).toBe(1);
  });

  it('updates and restores every cached board variant under the board root', () => {
    const queryClient = new QueryClient();
    const userScope = 'user-123';
    const defaultBoardKey = __testing.taskQueryKeys.board(userScope);
    const filteredBoardKey = __testing.taskQueryKeys.board(userScope, { tag: ['api'] });

    queryClient.setQueryData(defaultBoardKey, board);
    queryClient.setQueryData(filteredBoardKey, board);

    const snapshots = __testing.collectBoardQueries(queryClient, userScope, (cachedBoard) =>
      __testing.removeTaskFromBoard(cachedBoard, '11111111-1111-4111-8111-111111111111'),
    );

    expect(snapshots).toHaveLength(2);
    expect(queryClient.getQueryData<TaskBoardResponse>(defaultBoardKey)?.summary.totalTasks).toBe(1);
    expect(queryClient.getQueryData<TaskBoardResponse>(filteredBoardKey)?.summary.totalTasks).toBe(1);

    __testing.restoreBoardSnapshots(queryClient, snapshots);

    expect(queryClient.getQueryData(defaultBoardKey)).toEqual(board);
    expect(queryClient.getQueryData(filteredBoardKey)).toEqual(board);
  });

  it('rolls back optimistic board moves after mutation failures', () => {
    const queryClient = new QueryClient();
    const userScope = 'user-123';
    const defaultBoardKey = __testing.taskQueryKeys.board(userScope);
    const filteredBoardKey = __testing.taskQueryKeys.board(userScope, { tag: ['api'] });

    queryClient.setQueryData(defaultBoardKey, board);
    queryClient.setQueryData(filteredBoardKey, board);

    const snapshots = __testing.collectBoardQueries(queryClient, userScope, (cachedBoard) =>
      __testing.applyOptimisticMoveToBoard(cachedBoard, {
        taskId: '11111111-1111-4111-8111-111111111111',
        targetStatus: 'DONE',
        targetIndex: 1,
      }),
    );

    expect(queryClient.getQueryData<TaskBoardResponse>(defaultBoardKey)?.columns[0].total).toBe(0);
    expect(queryClient.getQueryData<TaskBoardResponse>(filteredBoardKey)?.columns[0].total).toBe(0);

    __testing.restoreBoardSnapshots(queryClient, snapshots);

    expect(queryClient.getQueryData(defaultBoardKey)).toEqual(board);
    expect(queryClient.getQueryData(filteredBoardKey)).toEqual(board);
  });

  it('removes optimistic board moves from filtered caches when the target status no longer matches', () => {
    const updated = __testing.applyOptimisticMoveToBoard(
      board,
      {
        taskId: '11111111-1111-4111-8111-111111111111',
        targetStatus: 'DONE',
        targetIndex: 1,
      },
      { status: 'TODO' },
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 0,
      tasks: [],
    });
    expect(updated.columns[2]).toMatchObject({
      status: 'DONE',
      total: 1,
      tasks: [
        expect.objectContaining({
          id: '22222222-2222-4222-8222-222222222222',
        }),
      ],
    });
    expect(updated.summary).toEqual({
      totalsByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 1,
      },
      overdueByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
      totalTasks: 1,
      totalOverdue: 0,
    });
  });

  it('inserts a moved task into matching cached lists when it was not already present', () => {
    const list: TaskListData = {
      items: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Existing in-progress task',
          description: 'Already in the filtered cache',
          status: 'IN_PROGRESS',
          priority: 'LOW',
          dueDate: undefined,
          tags: ['ops'],
          createdAt: '2024-05-01T00:00:00.000Z',
          updatedAt: '2024-05-01T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    };
    const movedTask: TaskListItem = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Draft contract',
      description: 'Moves into the matching filtered cache',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: undefined,
      tags: ['api'],
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-06-16T00:00:00.000Z',
      _optimistic: false,
    };

    const updated = __testing.reconcileTaskInList(
      list,
      movedTask,
      { status: 'IN_PROGRESS' },
      movedTask.id,
    );

    expect(updated.items).toEqual([movedTask, list.items[0]]);
    expect(updated.total).toBe(2);
  });

  it('matches list tag filters case-insensitively during optimistic reconciliation', () => {
    const task: TaskListItem = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Draft contract',
      description: 'Moves into a mixed-case tag cache',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: undefined,
      tags: ['api'],
      createdAt: '2024-05-01T00:00:00.000Z',
      updatedAt: '2024-06-16T00:00:00.000Z',
    };

    expect(__testing.taskMatchesFilters(task, { tag: ['API'] })).toBe(true);
  });

  it('preserves caller mutation context when merging board-move internal context', () => {
    const merged = __testing.mergeMutationContext(
      {
        touchedQueries: [],
        optimisticTaskId: '11111111-1111-4111-8111-111111111111',
        taskSnapshot: null,
      },
      {
        rollbackToastId: 'toast-123',
        sourceColumnId: 'todo-column',
      },
    );

    expect(merged).toMatchObject({
      rollbackToastId: 'toast-123',
      sourceColumnId: 'todo-column',
      optimisticTaskId: '11111111-1111-4111-8111-111111111111',
      taskSnapshot: null,
      touchedQueries: [],
    });
  });

  it('falls back to board cache when resolving a task outside the first list page', () => {
    const queryClient = new QueryClient();
    const userScope = 'user-123';

    queryClient.setQueryData(__testing.taskQueryKeys.board(userScope), board);

    const resolved = __testing.selectTaskFromCache(
      queryClient,
      userScope,
      '11111111-1111-4111-8111-111111111111',
    );

    expect(resolved).toEqual(
      __testing.taskListItemFromBoardTask(board.columns[0].tasks[0]),
    );
    expect(resolved?._partial).toBe(true);
  });

  it('recomputes overdue summary when applying an optimistic board move', () => {
    const updated = __testing.applyOptimisticMoveToBoard(board, {
      taskId: '11111111-1111-4111-8111-111111111111',
      targetStatus: 'DONE',
      targetIndex: 1,
    });

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 0,
      overdueCount: 0,
      tags: [],
    });
    expect(updated.columns[2]).toMatchObject({
      status: 'DONE',
      total: 2,
      overdueCount: 0,
      tags: [
        { label: 'api', count: 1 },
        { label: 'docs', count: 1 },
      ],
    });
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
  });

  it('recomputes board metadata after optimistic delete', () => {
    const updated = __testing.removeTaskFromBoard(
      board,
      '11111111-1111-4111-8111-111111111111',
    );

    expect(updated.columns[0]).toMatchObject({
      status: 'TODO',
      total: 0,
      overdueCount: 0,
      tags: [],
      tasks: [],
    });
    expect(updated.summary).toEqual({
      totalsByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 1,
      },
      overdueByStatus: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
      totalTasks: 1,
      totalOverdue: 0,
    });
  });
});
