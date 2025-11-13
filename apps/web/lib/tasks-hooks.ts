'use client';

import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { ZodIssue } from 'zod';

import type { TaskRecordDTO } from '@taskforge/shared';

import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  TaskClientError,
} from './tasks-client';
import type {
  CreateTaskInput,
  TaskDeleteResponse,
  TaskClientErrorKind,
  TaskListQuery,
  TaskListResponse,
  UpdateTaskInput,
} from './tasks-client';
import { useAuth } from './use-auth';

export type TaskListItem = TaskRecordDTO & { _optimistic?: boolean };

export interface TaskListData extends Omit<TaskListResponse, 'items'> {
  items: TaskListItem[];
}

type TaskQueryFnData = TaskListData;

type TaskQueryKey = ReturnType<typeof taskQueryKeys.list>;

type TaskQueryOptions = Omit<
  UseQueryOptions<TaskQueryFnData, TaskClientError, TaskQueryFnData, TaskQueryKey>,
  'queryKey' | 'queryFn'
>;

type TaskListQueryResult = UseQueryResult<TaskQueryFnData, TaskClientError>;

interface TaskMutationContext {
  touchedQueries: Array<[QueryKey, TaskListData | undefined]>;
  optimisticTaskId?: string;
}

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

const TASK_QUERY_SCOPE = 'tasks';

const FALLBACK_USER_KEY = 'anonymous';

const taskQueryKeys = {
  all: (userKey: string) => [TASK_QUERY_SCOPE, userKey] as const,
  list: (userKey: string, filters: NormalizedTaskListFilters | undefined) =>
    [...taskQueryKeys.all(userKey), 'list', filters ?? {}] as const,
};

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

function toTaskOperationError(error: unknown): TaskOperationError | null {
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
  const { user } = useAuth();
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
    ...options,
  });

  const friendlyError = toTaskOperationError(query.error);

  return {
    data: query.data,
    tasks: query.data?.items ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
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
    if (!data) {
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

export function useCreateTask(
  options?: UseMutationOptions<TaskRecordDTO, TaskClientError, CreateTaskInput, TaskMutationContext>,
): UseTaskMutationResult<TaskRecordDTO, CreateTaskInput> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userScope = scopedQueryKey(user?.id);

  const mutation = useMutation<TaskRecordDTO, TaskClientError, CreateTaskInput, TaskMutationContext>({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onMutate: async (input: CreateTaskInput) => {
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
    onError: (
      error: TaskClientError,
      variables: CreateTaskInput,
      onMutateResult?: TaskMutationContext,
    ) => {
      if (!onMutateResult) {
        return;
      }

      for (const [key, snapshot] of onMutateResult.touchedQueries) {
        queryClient.setQueryData(key, snapshot);
      }

      options?.onError?.(error, variables, onMutateResult);
    },
    onSuccess: (
      result: TaskRecordDTO,
      variables: CreateTaskInput,
      onMutateResult?: TaskMutationContext,
    ) => {
      const taskItem: TaskListItem = { ...result };

      collectMatchingQueries(queryClient, userScope, (payload, filters) => {
        if (!taskMatchesFilters(taskItem, filters)) {
          if (onMutateResult?.optimisticTaskId) {
            return removeTaskFromList(payload, onMutateResult.optimisticTaskId);
          }
          return payload;
        }

        return replaceTaskInList(payload, onMutateResult?.optimisticTaskId, taskItem);
      });

      options?.onSuccess?.(result, variables, onMutateResult);
    },
    onSettled: (
      result: TaskRecordDTO | undefined,
      error: TaskClientError | null,
      variables: CreateTaskInput | undefined,
      onMutateResult?: TaskMutationContext,
    ) => {
      options?.onSettled?.(result, error, variables, onMutateResult);
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all(userScope) });
    },
    ...options,
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

  const mutation = useMutation<TaskRecordDTO, TaskClientError, UpdateTaskVariables, TaskMutationContext>({
    mutationFn: ({ id, input }: UpdateTaskVariables) => updateTask(id, input),
    onMutate: async ({ id, input }: UpdateTaskVariables) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all(userScope) });

      const touchedQueries = collectMatchingQueries(queryClient, userScope, (payload) => {
        const existing = payload.items.find((item) => item.id === id);
        if (!existing) {
          return payload;
        }

        return updateTaskInList(payload, id, {
          ...input,
          updatedAt: new Date().toISOString(),
          _optimistic: true,
        });
      });

      return { touchedQueries, optimisticTaskId: id } satisfies TaskMutationContext;
    },
    onError: (
      error: TaskClientError,
      variables: UpdateTaskVariables,
      onMutateResult?: TaskMutationContext,
    ) => {
      if (onMutateResult) {
        for (const [key, snapshot] of onMutateResult.touchedQueries) {
          queryClient.setQueryData(key, snapshot);
        }
      }

      options?.onError?.(error, variables, onMutateResult);
    },
    onSuccess: (
      result: TaskRecordDTO,
      variables: UpdateTaskVariables,
      onMutateResult?: TaskMutationContext,
    ) => {
      const taskItem: TaskListItem = { ...result };

      collectMatchingQueries(queryClient, userScope, (payload, filters) => {
        if (!taskMatchesFilters(taskItem, filters)) {
          if (onMutateResult?.optimisticTaskId) {
            return removeTaskFromList(payload, onMutateResult.optimisticTaskId);
          }
          return removeTaskFromList(payload, variables.id);
        }

        return replaceTaskInList(payload, onMutateResult?.optimisticTaskId ?? variables.id, taskItem);
      });

      options?.onSuccess?.(result, variables, onMutateResult);
    },
    onSettled: (
      result: TaskRecordDTO | undefined,
      error: TaskClientError | null,
      variables: UpdateTaskVariables | undefined,
      onMutateResult?: TaskMutationContext,
    ) => {
      options?.onSettled?.(result, error, variables, onMutateResult);
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all(userScope) });
    },
    ...options,
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

  const mutation = useMutation<TaskDeleteResponse, TaskClientError, { id: string }, TaskMutationContext>({
    mutationFn: ({ id }: { id: string }) => deleteTask(id),
    onMutate: async ({ id }: { id: string }) => {
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.all(userScope) });

      const touchedQueries = collectMatchingQueries(queryClient, userScope, (payload) =>
        removeTaskFromList(payload, id),
      );

      return { touchedQueries, optimisticTaskId: id } satisfies TaskMutationContext;
    },
    onError: (
      error: TaskClientError,
      variables: { id: string },
      onMutateResult?: TaskMutationContext,
    ) => {
      if (onMutateResult) {
        for (const [key, snapshot] of onMutateResult.touchedQueries) {
          queryClient.setQueryData(key, snapshot);
        }
      }

      options?.onError?.(error, variables, onMutateResult);
    },
    onSuccess: (
      result: TaskDeleteResponse,
      variables: { id: string },
      onMutateResult?: TaskMutationContext,
    ) => {
      options?.onSuccess?.(result, variables, onMutateResult);
    },
    onSettled: (
      result: TaskDeleteResponse | undefined,
      error: TaskClientError | null,
      variables: { id: string } | undefined,
      onMutateResult?: TaskMutationContext,
    ) => {
      options?.onSettled?.(result, error, variables, onMutateResult);
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all(userScope) });
    },
    ...options,
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
  toTaskOperationError,
  taskMatchesFilters,
  addTaskToList,
  replaceTaskInList,
  updateTaskInList,
  removeTaskFromList,
  taskQueryKeys,
};
