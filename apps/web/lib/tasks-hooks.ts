'use client';

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  type QueryClient,
} from '@tanstack/react-query';
import type { ZodIssue } from 'zod';

import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  listTags,
  getTaskBoard,
  moveTaskOnBoard,
  updateTask,
  TaskClientError,
} from './tasks-client';
import type {
  BoardMoveInput,
  CreateTaskInput,
  TaskClientErrorKind,
  TaskDeleteResponse,
  TaskListQuery,
  TaskListResponse,
  TaskBoardQuery,
  TaskBoardResponse,
  TagListResponse,
  TaskRecordDTO,
  UpdateTaskInput,
} from './tasks-client';
import { useAuth } from './use-auth';
import type { TaskStatus } from '@taskforge/shared';

export type TaskListItem = TaskRecordDTO & { _optimistic?: boolean; _partial?: boolean };

export interface TaskListData extends Omit<TaskListResponse, 'items'> {
  items: TaskListItem[];
}

type TaskQueryFnData = TaskListData;

type TaskQueryKey = ReturnType<typeof taskQueryKeys.list>;
type TaskBoardQueryKey = ReturnType<typeof taskQueryKeys.board>;
type TaskDetailQueryKey = ReturnType<typeof taskQueryKeys.detail>;
type TagQueryKey = ReturnType<typeof taskQueryKeys.tags>;

type TaskQueryOptions = Omit<
  UseQueryOptions<TaskQueryFnData, TaskClientError, TaskQueryFnData, TaskQueryKey>,
  'queryKey' | 'queryFn'
>;

type TaskBoardQueryOptions = Omit<
  UseQueryOptions<TaskBoardResponse, TaskClientError, TaskBoardResponse, TaskBoardQueryKey>,
  'queryKey' | 'queryFn'
>;

type TaskDetailQueryOptions = Omit<
  UseQueryOptions<TaskListItem, TaskClientError, TaskListItem, TaskDetailQueryKey>,
  'queryKey' | 'queryFn'
>;

type TagQueryOptions = Omit<
  UseQueryOptions<TagListResponse, TaskClientError, TagListResponse, TagQueryKey>,
  'queryKey' | 'queryFn'
>;

type TaskListQueryResult = UseQueryResult<TaskQueryFnData, TaskClientError>;
type TaskBoardQueryResult = UseQueryResult<TaskBoardResponse, TaskClientError>;
type TaskDetailQueryResult = UseQueryResult<TaskListItem, TaskClientError>;
type TagQueryResult = UseQueryResult<TagListResponse, TaskClientError>;

interface InternalTaskMutationContext {
  touchedQueries: Array<[QueryKey, TaskListData | undefined]>;
  optimisticTaskId?: string;
  boardSnapshot?: TaskBoardResponse;
  boardRollback?: BoardMoveRollback;
  taskSnapshot?: TaskListItem | null;
}

interface BoardMoveRollback {
  taskId: string;
  sourceStatus: TaskStatus;
  sourceIndex: number;
}

type TaskMutationContext<TContext extends object = object> =
  TContext & InternalTaskMutationContext;

export interface TaskOperationError {
  message: string;
  kind: TaskClientErrorKind | 'unknown';
  status?: number;
  error?: string;
  details?: unknown;
  issues?: ZodIssue[];
  raw: unknown;
}

export interface UseTasksQueryResult {
  data: TaskListData | undefined;
  tasks: TaskListItem[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  status: TaskListQueryResult['status'];
  fetchStatus: TaskListQueryResult['fetchStatus'];
  refetch: TaskListQueryResult['refetch'];
  queryKey: TaskQueryKey;
  error: TaskOperationError | null;
  rawError: unknown;
}

export interface UseTaskBoardQueryResult {
  data: TaskBoardResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  status: TaskBoardQueryResult['status'];
  fetchStatus: TaskBoardQueryResult['fetchStatus'];
  refetch: TaskBoardQueryResult['refetch'];
  queryKey: TaskBoardQueryKey;
  error: TaskOperationError | null;
  rawError: unknown;
}

export interface UseTagsQueryResult {
  data: TagListResponse | undefined;
  tags: TagListResponse['items'];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  status: TagQueryResult['status'];
  fetchStatus: TagQueryResult['fetchStatus'];
  refetch: TagQueryResult['refetch'];
  queryKey: TagQueryKey;
  error: TaskOperationError | null;
  rawError: unknown;
}

export interface UseTaskRecordQueryResult {
  data: TaskListItem | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  status: TaskDetailQueryResult['status'];
  fetchStatus: TaskDetailQueryResult['fetchStatus'];
  refetch: TaskDetailQueryResult['refetch'];
  queryKey: TaskDetailQueryKey | null;
  error: TaskOperationError | null;
  rawError: unknown;
}

export interface UseTaskMutationResult<TData, TVariables>
  extends Pick<
      UseMutationResult<TData, TaskClientError, TVariables, TaskMutationContext>,
      | 'mutate'
      | 'mutateAsync'
      | 'reset'
      | 'status'
      | 'isPending'
      | 'isSuccess'
      | 'isError'
      | 'data'
      | 'variables'
    > {
  error: TaskOperationError | null;
  rawError: unknown;
}

interface NormalizedTaskListFilters {
  page?: number;
  pageSize?: number;
  status?: TaskListQuery['status'];
  priority?: TaskListQuery['priority'];
  tag?: string[];
  q?: string;
  dueFrom?: string;
  dueTo?: string;
}

interface NormalizedTaskBoardFilters {
  tag?: string[];
}

const TASK_QUERY_SCOPE = 'tasks';

const FALLBACK_USER_KEY = 'anonymous';
const isDevMode = process.env.NODE_ENV !== 'production';

const taskQueryKeys = {
  all: (userKey: string) => [TASK_QUERY_SCOPE, userKey] as const,
  list: (userKey: string, filters: NormalizedTaskListFilters | undefined) =>
    [...taskQueryKeys.all(userKey), 'list', filters ?? {}] as const,
  boardRoot: (userKey: string) => [...taskQueryKeys.all(userKey), 'board'] as const,
  board: (userKey: string, filters?: NormalizedTaskBoardFilters | undefined) =>
    [...taskQueryKeys.boardRoot(userKey), filters ?? {}] as const,
  detail: (userKey: string, taskId: string) => [...taskQueryKeys.all(userKey), 'detail', taskId] as const,
  tags: (userKey: string) => [...taskQueryKeys.all(userKey), 'tags'] as const,
};

const OPTIMISTIC_ID_MAP_SCOPE = 'task-optimistic-map';

const optimisticIdMapKey = (userKey: string) => [OPTIMISTIC_ID_MAP_SCOPE, userKey] as const;

function stableSerialize(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  return JSON.stringify(value, (_, nested) => {
    if (Array.isArray(nested)) {
      return nested;
    }

    if (nested && typeof nested === 'object') {
      return Object.keys(nested as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (nested as Record<string, unknown>)[key];
          return acc;
        }, {});
    }

    return nested;
  });
}

function deserializeFilters(serialized: string): TaskListQuery | undefined {
  if (!serialized || serialized === 'undefined' || serialized === 'null') {
    return undefined;
  }

  try {
    return JSON.parse(serialized) as TaskListQuery;
  } catch {
    return undefined;
  }
}

function normalizeTaskListFilters(filters?: TaskListQuery): NormalizedTaskListFilters | undefined {
  if (!filters) {
    return undefined;
  }

  const normalized: NormalizedTaskListFilters = {};

  if (filters.page !== undefined) {
    normalized.page = filters.page;
  }

  if (filters.pageSize !== undefined) {
    normalized.pageSize = filters.pageSize;
  }

  if (filters.status) {
    normalized.status = filters.status;
  }

  if (filters.priority) {
    normalized.priority = filters.priority;
  }

  if (filters.tag) {
    const tags = Array.isArray(filters.tag) ? filters.tag : [filters.tag];
    normalized.tag = Array.from(new Set(tags.map((tag) => tag.trim()))).sort();
  }

  if (filters.q?.trim()) {
    normalized.q = filters.q.trim();
  }

  if (filters.dueFrom) {
    normalized.dueFrom = filters.dueFrom;
  }

  if (filters.dueTo) {
    normalized.dueTo = filters.dueTo;
  }

  return normalized;
}

function extractFiltersFromKey(queryKey: QueryKey): NormalizedTaskListFilters | undefined {
  if (!Array.isArray(queryKey) || queryKey.length < 4) {
    return undefined;
  }

  const maybeFilters = queryKey[3];
  if (maybeFilters && typeof maybeFilters === 'object') {
    const entries = Object.entries(maybeFilters as Record<string, unknown>).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return undefined;
    }

    return maybeFilters as NormalizedTaskListFilters;
  }

  return undefined;
}

function isTaskListQueryKey(queryKey: QueryKey, userScope: string): boolean {
  return Array.isArray(queryKey) && queryKey[0] === TASK_QUERY_SCOPE && queryKey[1] === userScope && queryKey[2] === 'list';
}

function isOptimisticIdMapQueryKey(queryKey: QueryKey, userScope: string): boolean {
  return Array.isArray(queryKey) && queryKey[0] === OPTIMISTIC_ID_MAP_SCOPE && queryKey[1] === userScope;
}

function createTaskClientErrorMessage(error: TaskClientError): string {
  switch (error.kind) {
    case 'validation':
      return 'Some fields were invalid. Please review the highlighted values and try again.';
    case 'network':
      return 'We could not reach the task service. Check your connection and try again.';
    case 'serialization':
      return 'The task service responded in an unexpected format. Please retry in a moment.';
    case 'http': {
      if (error.status === 401) {
        return 'You need to sign in before managing tasks.';
      }

      if (error.status === 403) {
        return 'You do not have permission to modify this task.';
      }

      if (error.status === 404) {
        return 'The requested task could not be found.';
      }

      if ((error.status ?? 0) >= 500) {
        return 'The task service is temporarily unavailable. Please try again shortly.';
      }

      return error.error ?? 'The task request could not be completed. Please try again.';
    }
    default:
      return 'Something went wrong while communicating with the task service. Please try again.';
  }
}

export function toTaskOperationError(error: unknown): TaskOperationError | null {
  if (!error) {
    return null;
  }

  if (error instanceof TaskClientError) {
    return {
      message: createTaskClientErrorMessage(error),
      kind: error.kind,
      status: error.status,
      error: error.error,
      details: error.details,
      issues: error.issues,
      raw: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred while working with tasks.',
      kind: 'unknown',
      raw: error,
    };
  }

  return {
    message: 'An unknown error occurred while working with tasks.',
    kind: 'unknown',
    raw: error,
  };
}

function cloneTaskList(data: TaskListData): TaskListData {
  return {
    ...data,
    items: data.items.map((item) => ({ ...item })),
  };
}

function addTaskToList(list: TaskListData, task: TaskListItem): TaskListData {
  if (list.page !== 1) {
    return list;
  }

  const filtered = list.items.filter((item) => item.id !== task.id);
  const nextItems = [task, ...filtered];

  if (nextItems.length > list.pageSize) {
    nextItems.length = list.pageSize;
  }

  const hasExisting = list.items.some((item) => item.id === task.id);
  return {
    ...list,
    items: nextItems,
    total: hasExisting ? list.total : list.total + 1,
  };
}

function replaceTaskInList(list: TaskListData, previousId: string | undefined, task: TaskListItem): TaskListData {
  const next = cloneTaskList(list);
  const placeholderIndex = previousId ? next.items.findIndex((item) => item.id === previousId) : -1;
  const actualIndex = next.items.findIndex((item) => item.id === task.id);

  if (placeholderIndex !== -1) {
    next.items[placeholderIndex] = task;
    return next;
  }

  if (actualIndex !== -1) {
    next.items[actualIndex] = task;
    return next;
  }

  if (next.page !== 1) {
    return next;
  }

  next.items.unshift(task);

  if (next.items.length > next.pageSize) {
    next.items.length = next.pageSize;
  }

  return {
    ...next,
    total: next.total + 1,
  };
}

function updateTaskInList(list: TaskListData, taskId: string, patch: Partial<TaskListItem>): TaskListData {
  const index = list.items.findIndex((item) => item.id === taskId);
  if (index === -1) {
    return list;
  }

  const next = cloneTaskList(list);
  next.items[index] = { ...next.items[index], ...patch };
  return next;
}

function reconcileTaskInList(
  list: TaskListData,
  task: TaskListItem,
  filters: NormalizedTaskListFilters | undefined,
  previousId?: string,
): TaskListData {
  if (!taskMatchesFilters(task, filters)) {
    return removeTaskFromList(list, previousId ?? task.id);
  }

  return replaceTaskInList(list, previousId, task);
}

function taskListItemFromBoardTask(task: TaskBoardResponse['columns'][number]['tasks'][number]): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    description: undefined,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: [...task.tags],
    createdAt: task.updatedAt,
    updatedAt: task.updatedAt,
    _partial: true,
  };
}

function mergeMutationContext<TContext extends object>(
  internalContext: InternalTaskMutationContext,
  externalContext: TContext | undefined,
): TaskMutationContext<TContext> {
  if (!externalContext) {
    return internalContext as TaskMutationContext<TContext>;
  }

  return {
    ...externalContext,
    ...internalContext,
  };
}

function summarizeBoardTaskTags(tasks: TaskBoardResponse['columns'][number]['tasks']) {
  const counts = new Map<string, number>();

  for (const task of tasks) {
    for (const label of task.tags) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
}

function isBoardTaskOverdue(task: TaskBoardResponse['columns'][number]['tasks'][number], now: Date): boolean {
  if (!task.dueDate || task.status === 'DONE') {
    return false;
  }

  const due = Date.parse(task.dueDate);
  if (Number.isNaN(due)) {
    return false;
  }

  return due < now.getTime();
}

function rebuildBoardColumns(columns: TaskBoardResponse['columns'], now: Date): TaskBoardResponse['columns'] {
  return columns.map((column) => {
    const tasks = column.tasks.map((task, index) => ({
      ...task,
      position: index,
    }));

    return {
      ...column,
      tasks,
      total: tasks.length,
      overdueCount: tasks.filter((task) => isBoardTaskOverdue(task, now)).length,
      tags: summarizeBoardTaskTags(tasks),
    };
  });
}

function buildBoardSummary(columns: TaskBoardResponse['columns']): TaskBoardResponse['summary'] {
  const totalsByStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  } satisfies TaskBoardResponse['summary']['totalsByStatus'];
  const overdueByStatus = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  } satisfies TaskBoardResponse['summary']['overdueByStatus'];

  for (const column of columns) {
    totalsByStatus[column.status] = column.total;
    overdueByStatus[column.status] = column.overdueCount;
  }

  return {
    totalsByStatus,
    overdueByStatus,
    totalTasks: Object.values(totalsByStatus).reduce((sum, value) => sum + value, 0),
    totalOverdue: Object.values(overdueByStatus).reduce((sum, value) => sum + value, 0),
  };
}

function applyTaskUpdateToBoard(
  board: TaskBoardResponse,
  taskId: string,
  patch: Partial<TaskListItem>,
  now: Date = new Date(),
): TaskBoardResponse {
  const columns = board.columns.map((column) => ({
    ...column,
    tasks: column.tasks.map((task) => ({ ...task })),
  }));
  const sourceColumn = columns.find((column) => column.tasks.some((task) => task.id === taskId));

  if (!sourceColumn) {
    return board;
  }

  const sourceIndex = sourceColumn.tasks.findIndex((task) => task.id === taskId);
  const existingTask = sourceColumn.tasks[sourceIndex];
  const hasDueDatePatch = Object.prototype.hasOwnProperty.call(patch, 'dueDate');
  const hasTagsPatch = Object.prototype.hasOwnProperty.call(patch, 'tags');
  const nextStatus = patch.status ?? existingTask.status;
  const updatedTask = {
    ...existingTask,
    title: patch.title ?? existingTask.title,
    status: nextStatus,
    priority: patch.priority ?? existingTask.priority,
    dueDate: hasDueDatePatch ? patch.dueDate : existingTask.dueDate,
    tags: hasTagsPatch ? patch.tags ?? [] : existingTask.tags,
    updatedAt: patch.updatedAt ?? existingTask.updatedAt,
  };

  sourceColumn.tasks.splice(sourceIndex, 1);

  if (nextStatus === sourceColumn.status) {
    sourceColumn.tasks.splice(sourceIndex, 0, updatedTask);
  } else {
    const targetColumn = columns.find((column) => column.status === nextStatus);
    if (!targetColumn) {
      return board;
    }

    targetColumn.tasks.push(updatedTask);
  }

  const nextColumns = rebuildBoardColumns(columns, now);
  return {
    ...board,
    columns: nextColumns,
    summary: buildBoardSummary(nextColumns),
    updatedAt: patch.updatedAt ?? now.toISOString(),
  };
}

function removeTaskFromList(list: TaskListData, taskId: string): TaskListData {
  const index = list.items.findIndex((item) => item.id === taskId);
  if (index === -1) {
    return list;
  }

  const nextItems = list.items.filter((item) => item.id !== taskId);
  return {
    ...list,
    items: nextItems,
    total: Math.max(0, list.total - 1),
  };
}

function removeTaskFromBoard(board: TaskBoardResponse, taskId: string): TaskBoardResponse {
  const columns = board.columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => task.id !== taskId).map((task) => ({ ...task })),
  }));

  const removedCount = board.columns.reduce((count, column) => {
    const remaining = columns.find((nextColumn) => nextColumn.status === column.status);
    return count + (column.tasks.length - (remaining?.tasks.length ?? 0));
  }, 0);

  if (removedCount === 0) {
    return board;
  }

  const now = new Date();
  const nextColumns = rebuildBoardColumns(columns, now);
  return {
    ...board,
    columns: nextColumns,
    summary: buildBoardSummary(nextColumns),
    updatedAt: now.toISOString(),
  };
}

function normalizeTaskBoardFilters(filters?: TaskBoardQuery): NormalizedTaskBoardFilters | undefined {
  if (!filters) {
    return undefined;
  }

  const normalized: NormalizedTaskBoardFilters = {};

  if (filters.tag) {
    const tags = Array.isArray(filters.tag) ? filters.tag : [filters.tag];
    const normalizedTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).sort();
    if (normalizedTags.length > 0) {
      normalized.tag = normalizedTags;
    }
  }

  return Object.keys(normalized).length ? normalized : undefined;
}

function getBoardMoveRollback(board: TaskBoardResponse, taskId: string): BoardMoveRollback | undefined {
  for (const column of board.columns) {
    const sourceIndex = column.tasks.findIndex((task) => task.id === taskId);
    if (sourceIndex !== -1) {
      return {
        taskId,
        sourceStatus: column.status,
        sourceIndex,
      };
    }
  }

  return undefined;
}

function applyOptimisticMoveToBoard(board: TaskBoardResponse, input: MoveTaskVariables): TaskBoardResponse {
  const columns = board.columns.map((column) => ({
    ...column,
    tasks: column.tasks.map((task) => ({ ...task })),
  }));
  let movedTask: (typeof columns)[number]['tasks'][number] | null = null;

  for (const column of columns) {
    const index = column.tasks.findIndex((task) => task.id === input.taskId);
    if (index !== -1) {
      const [task] = column.tasks.splice(index, 1);
      movedTask = { ...task, status: input.targetStatus };
      break;
    }
  }

  if (!movedTask) {
    return board;
  }

  const targetColumn = columns.find((column) => column.status === input.targetStatus);
  if (!targetColumn) {
    return board;
  }

  const insertIndex = Math.max(0, Math.min(input.targetIndex, targetColumn.tasks.length));
  targetColumn.tasks.splice(insertIndex, 0, movedTask);
  const now = new Date();
  const nextColumns = rebuildBoardColumns(columns, now);

  return {
    ...board,
    columns: nextColumns,
    summary: buildBoardSummary(nextColumns),
    updatedAt: now.toISOString(),
  };
}

function rollbackOptimisticMoveOnBoard(
  board: TaskBoardResponse,
  rollback: BoardMoveRollback,
): TaskBoardResponse {
  const columns = board.columns.map((column) => ({
    ...column,
    tasks: column.tasks.map((task) => ({ ...task })),
  }));
  let movedTask: (typeof columns)[number]['tasks'][number] | null = null;

  for (const column of columns) {
    const index = column.tasks.findIndex((task) => task.id === rollback.taskId);
    if (index !== -1) {
      const [task] = column.tasks.splice(index, 1);
      movedTask = { ...task, status: rollback.sourceStatus };
      break;
    }
  }

  if (!movedTask) {
    return board;
  }

  const sourceColumn = columns.find((column) => column.status === rollback.sourceStatus);
  if (!sourceColumn) {
    return board;
  }

  const insertIndex = Math.max(0, Math.min(rollback.sourceIndex, sourceColumn.tasks.length));
  sourceColumn.tasks.splice(insertIndex, 0, movedTask);
  const now = new Date();
  const nextColumns = rebuildBoardColumns(columns, now);

  return {
    ...board,
    columns: nextColumns,
    summary: buildBoardSummary(nextColumns),
    updatedAt: now.toISOString(),
  };
}

function taskMatchesFilters(task: TaskListItem, filters?: NormalizedTaskListFilters): boolean {
  if (!filters) {
    return true;
  }

  if (filters.status && task.status !== filters.status) {
    return false;
  }

  if (filters.priority && task.priority !== filters.priority) {
    return false;
  }

  if (filters.tag && filters.tag.some((tag) => !task.tags.includes(tag))) {
    return false;
  }

  if (filters.q) {
    const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) {
      return false;
    }
  }

  if (filters.dueFrom) {
    if (!task.dueDate) {
      return false;
    }
    if (Date.parse(task.dueDate) < Date.parse(filters.dueFrom)) {
      return false;
    }
  }

  if (filters.dueTo) {
    if (!task.dueDate) {
      return false;
    }
    if (Date.parse(task.dueDate) > Date.parse(filters.dueTo)) {
      return false;
    }
  }

  return true;
}

function scopedQueryKey(userId?: string | null): string {
  return userId ?? FALLBACK_USER_KEY;
}

function deserializeNormalizedFilters(serialized: string): NormalizedTaskListFilters | undefined {
  if (!serialized || serialized === 'undefined' || serialized === 'null') {
    return undefined;
  }

  try {
    return JSON.parse(serialized) as NormalizedTaskListFilters;
  } catch {
    return undefined;
  }
}

export function useTasksQuery(filters?: TaskListQuery, options?: TaskQueryOptions): UseTasksQueryResult {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);
  const filtersSignature = useMemo(() => stableSerialize(filters), [filters]);
  const normalizedHash = useMemo(() => {
    const parsedFilters = deserializeFilters(filtersSignature);
    const normalized = normalizeTaskListFilters(parsedFilters);
    return stableSerialize(normalized);
  }, [filtersSignature]);

  const userScope = scopedQueryKey(user?.id);
  const queryKey = useMemo(
    () => taskQueryKeys.list(userScope, deserializeNormalizedFilters(normalizedHash)),
    [userScope, normalizedHash],
  );

  useEffect(() => {
    if (status !== 'authenticated') {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(FALLBACK_USER_KEY) });
    }
  }, [queryClient, status]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(scopedQueryKey(previousUserId)) });
    }

    previousUserIdRef.current = nextUserId;
  }, [queryClient, user?.id]);

  const { enabled: optionsEnabled = true, ...queryOptions } = options ?? {};
  const isAuthenticated = status === 'authenticated' && Boolean(user?.id);
  const shouldDelayForAuth = optionsEnabled && status === 'loading';
  const effectiveEnabled = isAuthenticated && optionsEnabled;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const payload = await listTasks(filters);
      return {
        ...payload,
        items: payload.items.map((item) => ({ ...item })),
      } satisfies TaskListData;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: effectiveEnabled,
    ...queryOptions,
  });

  const friendlyError = toTaskOperationError(query.error);

  return {
    data: query.data,
    tasks: query.data?.items ?? [],
    isLoading: shouldDelayForAuth || query.isLoading,
    isFetching: shouldDelayForAuth || query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
    status: query.status,
    fetchStatus: query.fetchStatus,
    refetch: query.refetch,
    queryKey,
    error: friendlyError,
    rawError: query.error,
  };
}

export function useTaskBoardQuery(filters?: TaskBoardQuery, options?: TaskBoardQueryOptions): UseTaskBoardQueryResult {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);
  const filtersSignature = useMemo(() => stableSerialize(filters), [filters]);
  const normalizedHash = useMemo(() => {
    const parsedFilters = deserializeFilters(filtersSignature);
    const normalized = normalizeTaskBoardFilters(parsedFilters);
    return stableSerialize(normalized);
  }, [filtersSignature]);

  const userScope = scopedQueryKey(user?.id);
  const normalizedFilters = useMemo(
    () => deserializeNormalizedFilters(normalizedHash) as NormalizedTaskBoardFilters | undefined,
    [normalizedHash],
  );
  const queryKey = useMemo(
    () => taskQueryKeys.board(userScope, normalizedFilters),
    [userScope, normalizedFilters],
  );

  useEffect(() => {
    if (status !== 'authenticated') {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(FALLBACK_USER_KEY) });
    }
  }, [queryClient, status]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(scopedQueryKey(previousUserId)) });
    }

    previousUserIdRef.current = nextUserId;
  }, [queryClient, user?.id]);

  const { enabled: optionsEnabled = true, ...queryOptions } = options ?? {};
  const isAuthenticated = status === 'authenticated' && Boolean(user?.id);
  const shouldDelayForAuth = optionsEnabled && status === 'loading';
  const effectiveEnabled = isAuthenticated && optionsEnabled;

  const query = useQuery({
    queryKey,
    queryFn: () => getTaskBoard(normalizedFilters),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    enabled: effectiveEnabled,
    ...queryOptions,
  });

  const friendlyError = toTaskOperationError(query.error);

  return {
    data: query.data,
    isLoading: shouldDelayForAuth || query.isLoading,
    isFetching: shouldDelayForAuth || query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
    status: query.status,
    fetchStatus: query.fetchStatus,
    refetch: query.refetch,
    queryKey,
    error: friendlyError,
    rawError: query.error,
  };
}

export function useTagsQuery(options?: TagQueryOptions): UseTagsQueryResult {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);

  const userScope = scopedQueryKey(user?.id);
  const queryKey = useMemo(() => taskQueryKeys.tags(userScope), [userScope]);

  useEffect(() => {
    if (status !== 'authenticated') {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(FALLBACK_USER_KEY) });
    }
  }, [queryClient, status]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(scopedQueryKey(previousUserId)) });
    }

    previousUserIdRef.current = nextUserId;
  }, [queryClient, user?.id]);

  const { enabled: optionsEnabled = true, ...queryOptions } = options ?? {};
  const isAuthenticated = status === 'authenticated' && Boolean(user?.id);
  const shouldDelayForAuth = optionsEnabled && status === 'loading';
  const effectiveEnabled = isAuthenticated && optionsEnabled;

  const query = useQuery({
    queryKey,
    queryFn: () => listTags(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: effectiveEnabled,
    ...queryOptions,
  });

  const friendlyError = toTaskOperationError(query.error);

  return {
    data: query.data,
    tags: query.data?.items ?? [],
    isLoading: shouldDelayForAuth || query.isLoading,
    isFetching: shouldDelayForAuth || query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
    status: query.status,
    fetchStatus: query.fetchStatus,
    refetch: query.refetch,
    queryKey,
    error: friendlyError,
    rawError: query.error,
  };
}

export function useTaskRecordQuery(
  taskId?: string,
  options?: TaskDetailQueryOptions,
): UseTaskRecordQueryResult {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);
  const userScope = scopedQueryKey(user?.id);
  const queryKey = useMemo(
    () => (taskId ? taskQueryKeys.detail(userScope, taskId) : null),
    [taskId, userScope],
  );

  useEffect(() => {
    if (status !== 'authenticated') {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(FALLBACK_USER_KEY) });
    }
  }, [queryClient, status]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const nextUserId = user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      queryClient.removeQueries({ queryKey: taskQueryKeys.all(scopedQueryKey(previousUserId)) });
    }

    previousUserIdRef.current = nextUserId;
  }, [queryClient, user?.id]);

  const { enabled: optionsEnabled = true, ...queryOptions } = options ?? {};
  const isAuthenticated = status === 'authenticated' && Boolean(user?.id);
  const shouldDelayForAuth = optionsEnabled && status === 'loading';
  const effectiveEnabled = isAuthenticated && optionsEnabled && Boolean(taskId) && Boolean(queryKey);

  const query = useQuery({
    queryKey: queryKey ?? taskQueryKeys.detail(userScope, '__disabled__'),
    queryFn: async () => {
      const payload = await getTask(taskId as string);
      return { ...payload } satisfies TaskListItem;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: effectiveEnabled,
    ...queryOptions,
  });

  const friendlyError = toTaskOperationError(query.error);

  return {
    data: query.data,
    isLoading: shouldDelayForAuth || query.isLoading,
    isFetching: shouldDelayForAuth || query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
    status: query.status,
    fetchStatus: query.fetchStatus,
    refetch: query.refetch,
    queryKey,
    error: friendlyError,
    rawError: query.error,
  };
}

function buildOptimisticTask(input: CreateTaskInput): TaskListItem {
  const now = new Date().toISOString();
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    id: `optimistic-${randomId}`,
    title: input.title,
    description: input.description,
    status: input.status ?? 'TODO',
    priority: input.priority ?? 'MEDIUM',
    dueDate: input.dueDate,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    _optimistic: true,
  };
}

function collectMatchingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userScope: string,
  predicate: (payload: TaskListData, filters: NormalizedTaskListFilters | undefined) => TaskListData,
): Array<[QueryKey, TaskListData | undefined]> {
  const candidates = queryClient.getQueriesData<TaskListData>({ queryKey: taskQueryKeys.all(userScope) });
  const touched: Array<[QueryKey, TaskListData | undefined]> = [];

  for (const [key, data] of candidates) {
    if (!isTaskListQueryKey(key, userScope) || !data) {
      continue;
    }

    const filters = extractFiltersFromKey(key);
    const next = predicate(data, filters);

    if (next !== data) {
      touched.push([key, data]);
      queryClient.setQueryData(key, next);
    }
  }

  return touched;
}

function selectTaskFromCache(
  queryClient: QueryClient,
  userScope: string,
  taskId?: string,
): TaskListItem | null {
  if (!taskId) {
    return null;
  }

  const candidates = queryClient.getQueriesData<TaskListData>({ queryKey: taskQueryKeys.all(userScope) });
  for (const [key, data] of candidates) {
    if (!isTaskListQueryKey(key, userScope) || !data) {
      continue;
    }

    const match = data.items.find((item) => item.id === taskId);
    if (match) {
      return match;
    }
  }

  const detail = queryClient.getQueryData<TaskListItem>(taskQueryKeys.detail(userScope, taskId));
  if (detail) {
    return detail;
  }

  const boards = queryClient.getQueriesData<TaskBoardResponse>({ queryKey: taskQueryKeys.boardRoot(userScope) });
  for (const [, board] of boards) {
    const boardTask = board?.columns
      .flatMap((column) => column.tasks)
      .find((task) => task.id === taskId);
    if (boardTask) {
      return taskListItemFromBoardTask(boardTask);
    }
  }

  return null;
}

function selectReplacementTaskId(
  queryClient: QueryClient,
  userScope: string,
  optimisticTask: TaskListItem | null,
): string | null {
  if (!optimisticTask?._optimistic) {
    return null;
  }

  const mapping = queryClient.getQueryData<Record<string, string>>(optimisticIdMapKey(userScope));
  if (!mapping) {
    return null;
  }

  return mapping[optimisticTask.id] ?? null;
}

export function useCreateTask(
  options?: UseMutationOptions<TaskRecordDTO, TaskClientError, CreateTaskInput, TaskMutationContext>,
): UseTaskMutationResult<TaskRecordDTO, CreateTaskInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userScope = scopedQueryKey(user?.id);
  const { onError, onSuccess, onSettled, ...restOptions } = options ?? {};

  const mutation = useMutation<TaskRecordDTO, TaskClientError, CreateTaskInput, TaskMutationContext>({
    mutationFn: (input) => createTask(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all(userScope) });

      const optimisticTask = buildOptimisticTask(input);

      const touchedQueries = collectMatchingQueries(queryClient, userScope, (payload, filters) => {
        if (!taskMatchesFilters(optimisticTask, filters)) {
          return payload;
        }

        return addTaskToList(payload, optimisticTask);
      });

      return { touchedQueries, optimisticTaskId: optimisticTask.id } satisfies TaskMutationContext;
    },
    onError: (error, _variables, context, mutationContext) => {
      if (!context) {
        return;
      }

      for (const [key, snapshot] of context.touchedQueries) {
        queryClient.setQueryData(key, snapshot);
      }

      onError?.(error, _variables, context, mutationContext);
    },
    onSuccess: (result, variables, context, mutationContext) => {
      const taskItem: TaskListItem = { ...result };
      if (typeof context?.optimisticTaskId === 'string') {
        const optimisticTaskId = context.optimisticTaskId;
        queryClient.setQueryData<Record<string, string>>(optimisticIdMapKey(userScope), (previous) => ({
          ...(previous ?? {}),
          [optimisticTaskId]: taskItem.id,
        }));
      }

      collectMatchingQueries(queryClient, userScope, (payload, filters) => {
        if (!taskMatchesFilters(taskItem, filters)) {
          if (context?.optimisticTaskId) {
            return removeTaskFromList(payload, context.optimisticTaskId);
          }
          return payload;
        }

        return replaceTaskInList(payload, context?.optimisticTaskId, taskItem);
      });

      onSuccess?.(result, variables, context, mutationContext);
    },
    onSettled: (result, error, variables, context, mutationContext) => {
      onSettled?.(result, error, variables, context, mutationContext);
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all(userScope) });
    },
    ...restOptions,
  });

  const friendlyError = toTaskOperationError(mutation.error);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    status: mutation.status,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    data: mutation.data,
    variables: mutation.variables,
    error: friendlyError,
    rawError: mutation.error,
  };
}

export function useTaskFromCache(taskId?: string): TaskListItem | null {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userScope = scopedQueryKey(user?.id);
  const stableTaskId = taskId ?? undefined;

  const getSnapshot = useCallback(
    () => selectTaskFromCache(queryClient, userScope, stableTaskId),
    [queryClient, userScope, stableTaskId],
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!stableTaskId) {
        return () => {};
      }

      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        const key = event.query?.queryKey;
        if (Array.isArray(key) && key[0] === TASK_QUERY_SCOPE && key[1] === userScope) {
          onStoreChange();
        }
      });

      return unsubscribe;
    },
    [queryClient, userScope, stableTaskId],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useTaskReplacementId(optimisticTask: TaskListItem | null): string | null {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userScope = scopedQueryKey(user?.id);
  const stableOptimisticTask = optimisticTask?._optimistic ? optimisticTask : null;

  const getSnapshot = useCallback(
    () => selectReplacementTaskId(queryClient, userScope, stableOptimisticTask),
    [queryClient, userScope, stableOptimisticTask],
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!stableOptimisticTask) {
        return () => {};
      }

      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        const key = event.query?.queryKey;
        if (key && isOptimisticIdMapQueryKey(key, userScope)) {
          onStoreChange();
        }
      });

      return unsubscribe;
    },
    [queryClient, userScope, stableOptimisticTask],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

interface UpdateTaskVariables {
  id: string;
  input: UpdateTaskInput;
}

export function useUpdateTask(
  options?: UseMutationOptions<TaskRecordDTO, TaskClientError, UpdateTaskVariables, TaskMutationContext>,
): UseTaskMutationResult<TaskRecordDTO, UpdateTaskVariables> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userScope = scopedQueryKey(user?.id);
  const { onError, onSuccess, onSettled, ...restOptions } = options ?? {};

  const mutation = useMutation<TaskRecordDTO, TaskClientError, UpdateTaskVariables, TaskMutationContext>({
    mutationFn: ({ id, input }) => updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all(userScope) });
      const optimisticUpdatedAt = new Date().toISOString();

      const touchedQueries = collectMatchingQueries(queryClient, userScope, (payload) => {
        const existing = payload.items.find((item) => item.id === id);
        if (!existing) {
          return payload;
        }

        return updateTaskInList(payload, id, {
          ...input,
          updatedAt: optimisticUpdatedAt,
          _optimistic: true,
        });
      });

      const boardKey = taskQueryKeys.board(userScope);
      const boardSnapshot = queryClient.getQueryData<TaskBoardResponse>(boardKey);

      if (boardSnapshot) {
        queryClient.setQueryData<TaskBoardResponse>(
          boardKey,
          applyTaskUpdateToBoard(boardSnapshot, id, {
            ...input,
            updatedAt: optimisticUpdatedAt,
          }),
        );
      }

      return { touchedQueries, optimisticTaskId: id, boardSnapshot } satisfies TaskMutationContext;
    },
    onError: (error, variables, context, mutationContext) => {
      if (context) {
        for (const [key, snapshot] of context.touchedQueries) {
          queryClient.setQueryData(key, snapshot);
        }

        if (context.boardSnapshot) {
          queryClient.setQueryData(taskQueryKeys.board(userScope), context.boardSnapshot);
        }
      }

      onError?.(error, variables, context, mutationContext);
    },
    onSuccess: (result, variables, context, mutationContext) => {
      const taskItem: TaskListItem = { ...result };

      collectMatchingQueries(queryClient, userScope, (payload, filters) => {
        if (!taskMatchesFilters(taskItem, filters)) {
          return removeTaskFromList(payload, variables.id);
        }

        return replaceTaskInList(payload, context?.optimisticTaskId ?? variables.id, taskItem);
      });

      queryClient.setQueryData<TaskBoardResponse | undefined>(taskQueryKeys.board(userScope), (board) =>
        board ? applyTaskUpdateToBoard(board, variables.id, taskItem) : board,
      );

      onSuccess?.(result, variables, context, mutationContext);
    },
    onSettled: (result, error, variables, context, mutationContext) => {
      onSettled?.(result, error, variables, context, mutationContext);
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all(userScope) });
    },
    ...restOptions,
  });

  const friendlyError = toTaskOperationError(mutation.error);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    status: mutation.status,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    data: mutation.data,
    variables: mutation.variables,
    error: friendlyError,
    rawError: mutation.error,
  };
}

interface MoveTaskVariables extends BoardMoveInput {
  taskId: string;
  targetStatus: TaskStatus;
  targetIndex: number;
}

export function useMoveTaskOnBoard<TContext extends object = Record<string, never>>(
  options?: UseMutationOptions<
    TaskBoardResponse,
    TaskClientError,
    MoveTaskVariables,
    TaskMutationContext<TContext>
  >,
): UseTaskMutationResult<TaskBoardResponse, MoveTaskVariables> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userScope = scopedQueryKey(user?.id);
  const { onMutate, onError, onSuccess, onSettled, ...restOptions } = options ?? {};

  const mutation = useMutation<TaskBoardResponse, TaskClientError, MoveTaskVariables, TaskMutationContext<TContext>>({
    mutationFn: (input) => moveTaskOnBoard(input),
    onMutate: async (variables, mutationContext) => {
      const { taskId, targetStatus } = variables;
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all(userScope) });
      const optimisticUpdatedAt = new Date().toISOString();
      const taskSnapshot = selectTaskFromCache(queryClient, userScope, taskId);

      const touchedQueries = collectMatchingQueries(queryClient, userScope, (payload, filters) => {
        const sourceTask = payload.items.find((item) => item.id === taskId) ?? taskSnapshot;
        if (!sourceTask) {
          return payload;
        }

        const movedTask: TaskListItem = {
          ...sourceTask,
          status: targetStatus,
          updatedAt: optimisticUpdatedAt,
          _optimistic: true,
        };

        return reconcileTaskInList(payload, movedTask, filters, taskId);
      });

      const boardKey = taskQueryKeys.board(userScope);
      const boardSnapshot = queryClient.getQueryData<TaskBoardResponse>(boardKey);
      const boardRollback = boardSnapshot ? getBoardMoveRollback(boardSnapshot, taskId) : undefined;
      if (boardSnapshot) {
        queryClient.setQueryData<TaskBoardResponse>(boardKey, applyOptimisticMoveToBoard(boardSnapshot, variables));
      }

      const internalContext = {
        touchedQueries,
        optimisticTaskId: taskId,
        boardSnapshot,
        boardRollback,
        taskSnapshot,
      } satisfies InternalTaskMutationContext;
      const externalContext = await onMutate?.(variables, mutationContext);
      return mergeMutationContext(internalContext, externalContext);
    },
    onError: (error, variables, context, mutationContext) => {
      if (context) {
        for (const [key, snapshot] of context.touchedQueries) {
          queryClient.setQueryData(key, snapshot);
        }

        const boardRollback = context.boardRollback;
        if (boardRollback) {
          queryClient.setQueryData<TaskBoardResponse | undefined>(taskQueryKeys.board(userScope), (board) =>
            board ? rollbackOptimisticMoveOnBoard(board, boardRollback) : board,
          );
        } else if (context.boardSnapshot) {
          queryClient.setQueryData(taskQueryKeys.board(userScope), context.boardSnapshot);
        }
      }

      onError?.(error, variables, context, mutationContext);
    },
    onSuccess: (result, variables, context, mutationContext) => {
      if (context?.optimisticTaskId) {
        const boardTask =
          result.columns
            .flatMap((column) => column.tasks)
            .find((task) => task.id === context.optimisticTaskId) ?? null;

        collectMatchingQueries(queryClient, userScope, (payload, filters) => {
          const sourceTask =
            payload.items.find((item) => item.id === context.optimisticTaskId) ?? context.taskSnapshot;
          if (!sourceTask) {
            return payload;
          }

          const movedTask: TaskListItem = {
            ...sourceTask,
            _optimistic: false,
            title: boardTask?.title ?? sourceTask.title,
            status: boardTask?.status ?? variables.targetStatus,
            priority: boardTask?.priority ?? sourceTask.priority,
            dueDate: boardTask?.dueDate ?? sourceTask.dueDate,
            tags: boardTask?.tags ?? sourceTask.tags,
            updatedAt: boardTask?.updatedAt ?? new Date().toISOString(),
          };

          return reconcileTaskInList(
            payload,
            movedTask,
            filters,
            context.optimisticTaskId as string,
          );
        });
      }

      queryClient.setQueryData(taskQueryKeys.board(userScope), result);

      onSuccess?.(result, variables, context, mutationContext);
    },
    onSettled: (result, error, variables, context, mutationContext) => {
      onSettled?.(result, error, variables, context, mutationContext);

      if (isDevMode) {
        console.info('[board-move] mutation settled; scheduling revalidation', {
          taskId: variables.taskId,
          success: !error,
        });
      }

      void queryClient.refetchQueries({
        queryKey: taskQueryKeys.boardRoot(userScope),
        type: 'active',
      });
      void queryClient.refetchQueries({
        queryKey: taskQueryKeys.list(userScope, undefined),
        type: 'active',
      });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all(userScope) });
    },
    ...restOptions,
  });

  const friendlyError = toTaskOperationError(mutation.error);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    status: mutation.status,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    data: mutation.data,
    variables: mutation.variables,
    error: friendlyError,
    rawError: mutation.error,
  };
}

export function useDeleteTask(
  options?: UseMutationOptions<
    TaskDeleteResponse,
    TaskClientError,
    { id: string },
    TaskMutationContext
  >,
): UseTaskMutationResult<TaskDeleteResponse, { id: string }> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userScope = scopedQueryKey(user?.id);
  const { onError, onSuccess, onSettled, ...restOptions } = options ?? {};

  const mutation = useMutation<TaskDeleteResponse, TaskClientError, { id: string }, TaskMutationContext>({
    mutationFn: ({ id }) => deleteTask(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all(userScope) });

      const touchedQueries = collectMatchingQueries(queryClient, userScope, (payload) =>
        removeTaskFromList(payload, id),
      );

      const boardKey = taskQueryKeys.board(userScope);
      const boardSnapshot = queryClient.getQueryData<TaskBoardResponse>(boardKey);

      if (boardSnapshot) {
        queryClient.setQueryData<TaskBoardResponse>(boardKey, removeTaskFromBoard(boardSnapshot, id));
      }

      return { touchedQueries, optimisticTaskId: id, boardSnapshot } satisfies TaskMutationContext;
    },
    onError: (error, variables, context, mutationContext) => {
      if (context) {
        for (const [key, snapshot] of context.touchedQueries) {
          queryClient.setQueryData(key, snapshot);
        }

        if (context.boardSnapshot) {
          queryClient.setQueryData(taskQueryKeys.board(userScope), context.boardSnapshot);
        }
      }

      onError?.(error, variables, context, mutationContext);
    },
    onSuccess: (result, variables, context, mutationContext) => {
      onSuccess?.(result, variables, context, mutationContext);
    },
    onSettled: (result, error, variables, context, mutationContext) => {
      onSettled?.(result, error, variables, context, mutationContext);
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all(userScope) });
    },
    ...restOptions,
  });

  const friendlyError = toTaskOperationError(mutation.error);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    status: mutation.status,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    data: mutation.data,
    variables: mutation.variables,
    error: friendlyError,
    rawError: mutation.error,
  };
}

export const __testing = {
  stableSerialize,
  deserializeFilters,
  normalizeTaskListFilters,
  deserializeNormalizedFilters,
  createTaskClientErrorMessage,
  taskMatchesFilters,
  addTaskToList,
  replaceTaskInList,
  updateTaskInList,
  reconcileTaskInList,
  taskListItemFromBoardTask,
  selectTaskFromCache,
  mergeMutationContext,
  applyTaskUpdateToBoard,
  applyOptimisticMoveToBoard,
  removeTaskFromList,
  removeTaskFromBoard,
  taskQueryKeys,
};
