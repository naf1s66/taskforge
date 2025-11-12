import { getSessionCookieName, type TaskDTO, type TaskRecordDTO, type TaskPriority, type TaskStatus } from '@taskforge/shared';
import { z } from 'zod';

import { getApiBaseUrl } from './env';

const SESSION_COOKIE_NAME = getSessionCookieName();

const TaskStatusSchema = z.union([z.literal('TODO'), z.literal('IN_PROGRESS'), z.literal('DONE')]);
const TaskPrioritySchema = z.union([z.literal('LOW'), z.literal('MEDIUM'), z.literal('HIGH')]);

const NonEmptyTrimmedString = z.string().trim().min(1);

const NullableDateString = z
  .string()
  .datetime()
  .optional()
  .nullable()
  .transform((value) => value ?? undefined);

const NullableString = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable()
  .transform((value) => value ?? undefined);

const TaskRecordSchema = z.object({
  id: z.string().uuid(),
  title: NonEmptyTrimmedString,
  description: NullableString,
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: NullableDateString,
  tags: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TaskListResponseSchema = z.object({
  items: z.array(TaskRecordSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
});

const TaskDeleteResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal('deleted'),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().nullish(),
});

const TaskIdSchema = z.string().uuid({ message: 'Task id must be a valid UUID.' });

const TaskCreateSchema = z
  .object({
    title: NonEmptyTrimmedString,
    description: NullableString,
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    dueDate: NullableDateString,
    tags: z.array(NonEmptyTrimmedString).optional(),
  })
  .transform((value) => ({
    ...value,
    tags: value.tags ?? [],
  }));

const TaskUpdateSchema = z
  .object({
    title: NonEmptyTrimmedString.optional(),
    description: NullableString,
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    dueDate: NullableDateString,
    tags: z.array(NonEmptyTrimmedString).optional(),
  })
  .superRefine((value, ctx) => {
    if (Object.values(value).every((entry) => entry === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Update payload must include at least one field.',
      });
    }
  })
  .transform((value) => ({
    ...value,
    tags: value.tags ?? undefined,
  }));

const TaskListQuerySchema = z
  .object({
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    tag: z
      .union([NonEmptyTrimmedString, z.array(NonEmptyTrimmedString)])
      .optional()
      .transform((value) => {
        if (!value) {
          return undefined;
        }
        return Array.isArray(value) ? value : [value];
      }),
    q: z.string().trim().min(1).optional().transform((value) => value?.trim()),
    dueFrom: z.string().datetime().optional(),
    dueTo: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dueFrom && value.dueTo) {
      const from = Date.parse(value.dueFrom);
      const to = Date.parse(value.dueTo);
      if (!Number.isNaN(from) && !Number.isNaN(to) && from > to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dueFrom'],
          message: 'dueFrom must be earlier than or equal to dueTo.',
        });
      }
    }
  });

export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
export type TaskDeleteResponse = z.infer<typeof TaskDeleteResponseSchema>;

export type CreateTaskInput = Omit<TaskDTO, 'id'>;
export type UpdateTaskInput = Partial<Omit<TaskDTO, 'id'>>;
export type TaskListQuery = {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  tag?: string | string[];
  q?: string;
  dueFrom?: string;
  dueTo?: string;
};

type NormalizedTaskListQuery = z.infer<typeof TaskListQuerySchema>;

export type TaskClientErrorKind = 'validation' | 'http' | 'network' | 'serialization';

export interface TaskClientErrorInit {
  kind: TaskClientErrorKind;
  status?: number;
  error?: string;
  details?: unknown;
  issues?: z.ZodIssue[];
  cause?: unknown;
}

export class TaskClientError extends Error {
  readonly kind: TaskClientErrorKind;
  readonly status?: number;
  readonly error?: string;
  readonly details?: unknown;
  readonly issues?: z.ZodIssue[];

  constructor(message: string, init: TaskClientErrorInit) {
    super(message);
    this.name = 'TaskClientError';
    this.kind = init.kind;
    this.status = init.status;
    this.error = init.error;
    this.details = init.details;
    this.issues = init.issues;

    if (init.cause !== undefined) {
      // @ts-expect-error Node 18 target may not include the cause property
      this.cause = init.cause;
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface TaskClientAuthState {
  sessionCookie?: string;
  accessToken?: string;
}

export interface TaskClientRequestOptions extends TaskClientAuthState {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  headers?: HeadersInit;
  cookieHeader?: string;
  credentials?: RequestCredentials;
}

let manualServerAuthState: TaskClientAuthState | undefined;
let triedLoadingNextCookies = false;
let nextCookiesGetter: (() => { get(name: string): { value?: string } | undefined } | undefined) | undefined;
let serverAuthStoragePromise: Promise<import('node:async_hooks').AsyncLocalStorage<TaskClientAuthState> | null> | null = null;
let serverAuthStorage: import('node:async_hooks').AsyncLocalStorage<TaskClientAuthState> | null | undefined;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

async function loadServerAuthStorage(): Promise<import('node:async_hooks').AsyncLocalStorage<TaskClientAuthState> | null> {
  if (isBrowser()) {
    return null;
  }

  if (serverAuthStorage !== undefined) {
    return serverAuthStorage;
  }

  if (serverAuthStoragePromise) {
    return serverAuthStoragePromise;
  }

  serverAuthStoragePromise = import('node:async_hooks')
    .then((module) => {
      serverAuthStorage = new module.AsyncLocalStorage<TaskClientAuthState>();
      return serverAuthStorage;
    })
    .catch(() => {
      serverAuthStorage = null;
      return null;
    })
    .finally(() => {
      serverAuthStoragePromise = null;
    });

  return serverAuthStoragePromise;
}

async function getServerAuthState(): Promise<TaskClientAuthState | undefined> {
  if (isBrowser()) {
    return undefined;
  }

  const storage = await loadServerAuthStorage();
  if (storage) {
    return storage.getStore() ?? undefined;
  }

  return manualServerAuthState;
}

async function tryReadNextSessionCookie(): Promise<string | undefined> {
  if (isBrowser()) {
    return undefined;
  }

  if (!triedLoadingNextCookies) {
    triedLoadingNextCookies = true;
    try {
      const module = await import('next/headers');
      if (typeof module.cookies === 'function') {
        nextCookiesGetter = module.cookies;
      } else {
        nextCookiesGetter = undefined;
      }
    } catch {
      nextCookiesGetter = undefined;
    }
  }

  if (!nextCookiesGetter) {
    return undefined;
  }

  try {
    const cookieStore = nextCookiesGetter();
    const cookie = cookieStore?.get?.(SESSION_COOKIE_NAME);
    return cookie?.value;
  } catch {
    return undefined;
  }
}

async function resolveSessionCookie(options?: TaskClientRequestOptions): Promise<string | undefined> {
  if (options?.sessionCookie) {
    return options.sessionCookie;
  }

  const state = await getServerAuthState();
  if (state?.sessionCookie) {
    return state.sessionCookie;
  }

  return tryReadNextSessionCookie();
}

async function resolveAccessToken(options?: TaskClientRequestOptions): Promise<string | undefined> {
  if (options?.accessToken) {
    return options.accessToken;
  }

  const state = await getServerAuthState();
  return state?.accessToken;
}

function ensureBaseUrl(options?: TaskClientRequestOptions): string {
  const fromOptions = options?.baseUrl;
  if (fromOptions) {
    return fromOptions.replace(/\/$/, '');
  }

  return getApiBaseUrl();
}

function toQueryRecord(query?: NormalizedTaskListQuery): Record<string, string | string[]> | undefined {
  if (!query) {
    return undefined;
  }

  const record: Record<string, string | string[]> = {};

  if (query.page !== undefined) {
    record.page = String(query.page);
  }

  if (query.pageSize !== undefined) {
    record.pageSize = String(query.pageSize);
  }

  if (query.status) {
    record.status = query.status;
  }

  if (query.priority) {
    record.priority = query.priority;
  }

  if (query.tag && query.tag.length > 0) {
    record.tag = query.tag;
  }

  if (query.q) {
    record.q = query.q;
  }

  if (query.dueFrom) {
    record.dueFrom = query.dueFrom;
  }

  if (query.dueTo) {
    record.dueTo = query.dueTo;
  }

  return record;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | string[]>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (query) {
    const params = url.searchParams;
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          params.append(key, entry);
        });
      } else if (value !== undefined) {
        params.append(key, value);
      }
    });
  }

  return url.toString();
}

async function applyAuth(headers: Headers, options?: TaskClientRequestOptions): Promise<RequestCredentials | undefined> {
  const explicitCookieHeader = options?.cookieHeader;
  if (explicitCookieHeader) {
    headers.set('cookie', explicitCookieHeader);
  } else if (!isBrowser()) {
    const cookie = await resolveSessionCookie(options);
    if (cookie && !headers.has('cookie')) {
      headers.set('cookie', `${SESSION_COOKIE_NAME}=${cookie}`);
    }
  }

  const accessToken = await resolveAccessToken(options);
  if (accessToken) {
    headers.set('authorization', accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`);
  }

  if (options?.credentials) {
    return options.credentials;
  }

  if (isBrowser()) {
    return 'include';
  }

  return undefined;
}

async function parseJson<T>(response: Response, schema: z.ZodSchema<T>): Promise<T> {
  const raw = await response.json().catch(() => {
    throw new TaskClientError('Failed to parse response body as JSON.', {
      kind: 'serialization',
      status: response.status,
    });
  });

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new TaskClientError('Response payload was not in the expected shape.', {
      kind: 'serialization',
      status: response.status,
      issues: parsed.error.issues,
    });
  }

  return parsed.data;
}

async function handleError(response: Response): Promise<never> {
  let payload: z.infer<typeof ErrorResponseSchema> | undefined;

  try {
    payload = ErrorResponseSchema.parse(await response.clone().json());
  } catch {
    // ignore parse errors and fallback to plain text below
  }

  if (!payload) {
    try {
      const text = await response.text();
      throw new TaskClientError(`Request failed with status ${response.status}.`, {
        kind: 'http',
        status: response.status,
        details: text || undefined,
      });
    } catch (error) {
      throw new TaskClientError(`Request failed with status ${response.status}.`, {
        kind: 'http',
        status: response.status,
        cause: error,
      });
    }
  }

  throw new TaskClientError(payload.error || 'Request failed.', {
    kind: 'http',
    status: response.status,
    error: payload.error,
    details: payload.details ?? undefined,
  });
}

async function requestJson<T>(
  path: string,
  init: {
    method: string;
    body?: unknown;
    query?: Record<string, string | string[]>;
    schema: z.ZodSchema<T>;
  },
  options?: TaskClientRequestOptions,
): Promise<T> {
  const baseUrl = ensureBaseUrl(options);
  const url = buildUrl(baseUrl, path, init.query);

  const headers = new Headers(options?.headers ?? {});
  headers.set('accept', 'application/json');

  let body: string | undefined;
  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.body);
  }

  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new TaskClientError('Fetch API is not available in this environment.', {
      kind: 'network',
    });
  }

  const credentials = await applyAuth(headers, options);

  const response = await fetchImpl(url, {
    method: init.method,
    headers,
    body,
    signal: options?.signal,
    credentials,
  }).catch((error: unknown) => {
    throw new TaskClientError('Network request failed.', {
      kind: 'network',
      cause: error,
    });
  });

  if (!response.ok) {
    await handleError(response);
  }

  return parseJson(response, init.schema);
}

export async function listTasks(
  params?: TaskListQuery,
  options?: TaskClientRequestOptions,
): Promise<TaskListResponse> {
  let normalizedQuery: NormalizedTaskListQuery | undefined;
  if (params) {
    const parsed = TaskListQuerySchema.safeParse(params);
    if (!parsed.success) {
      throw new TaskClientError('Task filters were invalid.', {
        kind: 'validation',
        issues: parsed.error.issues,
      });
    }
    normalizedQuery = parsed.data;
  }

  return requestJson(
    'v1/tasks',
    {
      method: 'GET',
      query: toQueryRecord(normalizedQuery),
      schema: TaskListResponseSchema,
    },
    options,
  );
}

export async function createTask(
  input: CreateTaskInput,
  options?: TaskClientRequestOptions,
): Promise<TaskRecordDTO> {
  const parsed = TaskCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new TaskClientError('Task payload was invalid.', {
      kind: 'validation',
      issues: parsed.error.issues,
    });
  }

  return requestJson(
    'v1/tasks',
    {
      method: 'POST',
      body: parsed.data,
      schema: TaskRecordSchema,
    },
    options,
  );
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  options?: TaskClientRequestOptions,
): Promise<TaskRecordDTO> {
  const validatedId = TaskIdSchema.safeParse(id);
  if (!validatedId.success) {
    throw new TaskClientError('Task identifier was invalid.', {
      kind: 'validation',
      issues: validatedId.error.issues,
    });
  }

  const parsed = TaskUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new TaskClientError('Task update payload was invalid.', {
      kind: 'validation',
      issues: parsed.error.issues,
    });
  }

  return requestJson(
    `v1/tasks/${validatedId.data}`,
    {
      method: 'PATCH',
      body: parsed.data,
      schema: TaskRecordSchema,
    },
    options,
  );
}

export async function deleteTask(id: string, options?: TaskClientRequestOptions): Promise<TaskDeleteResponse> {
  const validatedId = TaskIdSchema.safeParse(id);
  if (!validatedId.success) {
    throw new TaskClientError('Task identifier was invalid.', {
      kind: 'validation',
      issues: validatedId.error.issues,
    });
  }

  return requestJson(
    `v1/tasks/${validatedId.data}`,
    {
      method: 'DELETE',
      schema: TaskDeleteResponseSchema,
    },
    options,
  );
}

export async function withTaskClientAuth<T>(
  auth: TaskClientAuthState,
  callback: () => Promise<T> | T,
): Promise<T> {
  if (isBrowser()) {
    return await callback();
  }

  const storage = await loadServerAuthStorage();
  if (storage) {
    return storage.run(auth, callback as () => T);
  }

  const previous = manualServerAuthState;
  manualServerAuthState = auth;
  try {
    return await callback();
  } finally {
    manualServerAuthState = previous;
  }
}

export function clearManualTaskClientAuthState(): void {
  manualServerAuthState = undefined;
}
