import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearBrowserTaskClientAuthState,
  clearManualTaskClientAuthState,
  createTask,
  deleteTask,
  getTask,
  getTaskBoard,
  listTags,
  listTasks,
  setBrowserTaskClientAuthState,
  TaskClientError,
  updateTask,
  withTaskClientAuth,
} from './tasks-client';

const API_BASE_URL = 'https://api.example.com/api/taskforge';

const sampleTask = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Draft API contract',
  description: 'Outline request and response shapes for task endpoints',
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  dueDate: '2024-07-01T10:00:00.000Z',
  tags: ['planning'],
  createdAt: '2024-06-01T12:00:00.000Z',
  updatedAt: '2024-06-01T12:00:00.000Z',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

const originalWindow = globalThis.window;

describe('tasks-client', () => {
  afterEach(() => {
    clearBrowserTaskClientAuthState();
    clearManualTaskClientAuthState();
    if (originalWindow) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  describe('listTasks', () => {
    it('serializes filters and includes credentials on the browser', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ items: [], page: 1, pageSize: 20, total: 0 }),
      );

      const result = await listTasks(
        {
          page: 2,
          pageSize: 50,
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          tag: ['frontend', 'api'],
          q: '   sprint ',
          dueFrom: '2024-06-01T02:00:00+02:00',
        },
        { baseUrl: API_BASE_URL, fetchImpl: fetchMock },
      );

      expect(result).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('/v1/tasks');
      const parsedUrl = new URL(url as string);
      expect(parsedUrl.searchParams.get('page')).toBe('2');
      expect(parsedUrl.searchParams.get('pageSize')).toBe('50');
      expect(parsedUrl.searchParams.get('status')).toBe('IN_PROGRESS');
      expect(parsedUrl.searchParams.get('priority')).toBe('MEDIUM');
      expect(parsedUrl.searchParams.getAll('tag')).toEqual(['frontend', 'api']);
      expect(parsedUrl.searchParams.get('q')).toBe('sprint');
      expect(parsedUrl.searchParams.get('dueFrom')).toBe('2024-06-01T02:00:00+02:00');
      expect((init as RequestInit)?.credentials).toBe('include');
      const headers = (init as RequestInit).headers as Headers;
      expect(headers.get('accept')).toBe('application/json');
      expect(headers.get('content-type')).toBeNull();
    });

    it('supports relative base URLs on the server', async () => {
      delete (globalThis as Record<string, unknown>).window;

      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ items: [], page: 1, pageSize: 20, total: 0 }));

      await listTasks(undefined, { baseUrl: '/api/taskforge', fetchImpl: fetchMock });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/taskforge/v1/tasks');
    });

    it('throws a validation error when filters are invalid', async () => {
      await expect(
        listTasks(
          {
            page: 0,
          },
          { baseUrl: API_BASE_URL, fetchImpl: vi.fn() },
        ),
      ).rejects.toMatchObject({ kind: 'validation' satisfies TaskClientError['kind'] });
    });

    it('attaches the dev bypass token header on the browser when present', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ items: [], page: 1, pageSize: 20, total: 0 }),
      );

      setBrowserTaskClientAuthState({ devBypassToken: 'dev-bypass-token-123' });

      await listTasks(undefined, { baseUrl: API_BASE_URL, fetchImpl: fetchMock });

      const [, init] = fetchMock.mock.calls[0];
      const headers = (init as RequestInit).headers as Headers;
      expect(headers.get('x-taskforge-dev-bypass')).toBe('dev-bypass-token-123');
    });
  });

  describe('createTask', () => {
    it('performs client-side validation before sending the request', async () => {
      await expect(
        createTask(
          {
            title: '   ',
          },
          { baseUrl: API_BASE_URL, fetchImpl: vi.fn() },
        ),
      ).rejects.toMatchObject({ kind: 'validation' satisfies TaskClientError['kind'] });
    });

    it('sends the session cookie when running on the server', async () => {
      // Simulate server environment
      delete (globalThis as Record<string, unknown>).window;

      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleTask));
      await createTask(
        {
          title: 'Draft API contract',
          description: 'Outline request and response shapes for task endpoints',
          status: 'TODO',
          priority: 'HIGH',
          dueDate: '2024-07-01T10:00:00.000Z',
          tags: ['planning'],
        },
        { baseUrl: API_BASE_URL, fetchImpl: fetchMock, sessionCookie: 'cookie-123' },
      );

      const [, init] = fetchMock.mock.calls[0];
      const headers = (init as RequestInit).headers as Headers;
      expect(headers.get('cookie')).toBe('tf_session=cookie-123');
      expect(headers.get('content-type')).toBe('application/json');
    });
  });

  describe('updateTask', () => {
    it('attaches a bearer token when provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...sampleTask, status: 'DONE' }));

      await updateTask(
        sampleTask.id,
        { status: 'DONE' },
        { baseUrl: API_BASE_URL, fetchImpl: fetchMock, accessToken: 'token-123' },
      );

      const [, init] = fetchMock.mock.calls[0];
      const headers = (init as RequestInit).headers as Headers;
      expect(headers.get('authorization')).toBe('Bearer token-123');
    });

    it('throws a serialization error when the server response is malformed', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          id: sampleTask.id,
          title: sampleTask.title,
        }),
      );

      await expect(
        updateTask(sampleTask.id, { status: 'DONE' }, { baseUrl: API_BASE_URL, fetchImpl: fetchMock }),
      ).rejects.toMatchObject({ kind: 'serialization' satisfies TaskClientError['kind'] });
    });
  });

  describe('getTask', () => {
    it('requests a single task record by id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleTask));

      const result = await getTask(sampleTask.id, {
        baseUrl: API_BASE_URL,
        fetchImpl: fetchMock,
      });

      expect(result).toEqual(sampleTask);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${API_BASE_URL}/v1/tasks/${sampleTask.id}`);
      expect((init as RequestInit)?.method).toBe('GET');
    });
  });

  describe('getTaskBoard', () => {
    it('serializes board filters', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          columns: [],
          summary: {
            totalsByStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
            overdueByStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
            totalTasks: 0,
            totalOverdue: 0,
          },
          updatedAt: '2024-06-01T00:00:00.000Z',
          generatedAt: '2024-06-01T00:00:00.000Z',
        }),
      );

      await getTaskBoard(
        {
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          tag: ['frontend', 'api'],
          q: ' board search ',
          dueFrom: '2026-05-01T02:00:00+02:00',
          dueTo: '2026-06-01T01:59:59+02:00',
        },
        { baseUrl: API_BASE_URL, fetchImpl: fetchMock },
      );

      const [url] = fetchMock.mock.calls[0];
      const parsedUrl = new URL(url as string);
      expect(parsedUrl.pathname).toBe('/api/taskforge/v1/tasks/board');
      expect(parsedUrl.searchParams.get('status')).toBe('IN_PROGRESS');
      expect(parsedUrl.searchParams.get('priority')).toBe('HIGH');
      expect(parsedUrl.searchParams.getAll('tag')).toEqual(['frontend', 'api']);
      expect(parsedUrl.searchParams.get('q')).toBe('board search');
      expect(parsedUrl.searchParams.get('dueFrom')).toBe('2026-05-01T02:00:00+02:00');
      expect(parsedUrl.searchParams.get('dueTo')).toBe('2026-06-01T01:59:59+02:00');
    });

    it('rejects inverted board due ranges before sending a request', async () => {
      const fetchMock = vi.fn();

      await expect(
        getTaskBoard(
          {
            dueFrom: '2026-05-31T00:00:00.000Z',
            dueTo: '2026-05-01T00:00:00.000Z',
          },
          { baseUrl: API_BASE_URL, fetchImpl: fetchMock },
        ),
      ).rejects.toMatchObject({
        kind: 'validation' satisfies TaskClientError['kind'],
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('listTags', () => {
    it('requests tag summaries from the tags endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({ items: [{ label: 'api', count: 2 }] }),
      );

      const result = await listTags({ baseUrl: API_BASE_URL, fetchImpl: fetchMock });

      expect(result).toEqual({ items: [{ label: 'api', count: 2 }] });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${API_BASE_URL}/v1/tags`);
      expect((init as RequestInit)?.method).toBe('GET');
    });
  });

  describe('deleteTask', () => {
    it('propagates structured API errors', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401));

      await expect(deleteTask(sampleTask.id, { baseUrl: API_BASE_URL, fetchImpl: fetchMock })).rejects.toMatchObject({
        kind: 'http' satisfies TaskClientError['kind'],
        status: 401,
        error: 'Unauthorized',
      });
    });
  });

  describe('withTaskClientAuth', () => {
    it('binds the session cookie to nested requests on the server', async () => {
      delete (globalThis as Record<string, unknown>).window;
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], page: 1, pageSize: 20, total: 0 }));

      await withTaskClientAuth({ sessionCookie: 'server-cookie' }, async () => {
        await listTasks(undefined, { baseUrl: API_BASE_URL, fetchImpl: fetchMock });
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      const headers = (init as RequestInit).headers as Headers;
      expect(headers.get('cookie')).toBe('tf_session=server-cookie');
    });
  });
});
