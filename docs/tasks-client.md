# Task API Client

The Task API client is a lightweight wrapper around the `/api/taskforge/v1/tasks` endpoints. It centralises
serialization rules, authentication, and error handling so UI layers can focus on rendering logic.

## Importing

```ts
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  withTaskClientAuth,
  type TaskListQuery,
  type CreateTaskInput,
  type UpdateTaskInput,
  TaskClientError,
} from '@/lib/tasks-client';
```

All helpers are framework-agnostic and only rely on the Fetch API. Consumers can override the `fetch` implementation or
base URL with the optional `TaskClientRequestOptions` argument.

## Authentication

On the browser the client automatically opts into `credentials: 'include'` so the `tf_session` cookie is forwarded
without any additional wiring.

On the server the client attempts to read the session cookie from:

1. The contextual auth passed to `withTaskClientAuth` (preferred).
2. The active Next.js request via `next/headers` (when available).
3. `TaskClientRequestOptions.sessionCookie` or `cookieHeader` overrides.

Wrap your server-side logic with `withTaskClientAuth` to bind a cookie or bearer token to all nested calls:

```ts
import { cookies } from 'next/headers';
import { getSessionCookieName } from '@taskforge/shared';

import { withTaskClientAuth, listTasks } from '@/lib/tasks-client';

const SESSION_COOKIE = getSessionCookieName();

export async function loadTasksForServerComponent() {
  const sessionCookie = cookies().get(SESSION_COOKIE)?.value;

  return withTaskClientAuth({ sessionCookie }, async () => {
    return listTasks({ pageSize: 50 });
  });
}
```

The helper falls back to a manual (non-isolated) store when `AsyncLocalStorage` is unavailable. Call
`clearManualTaskClientAuthState()` after each request if you use this fallback.

## Making requests

Each function performs minimal client-side validation with Zod and returns strongly typed DTOs. Validation errors throw a
`TaskClientError` with `kind: 'validation'` so UI layers can surface inline feedback.

```ts
try {
  const task = await createTask({
    title: 'Plan sprint review',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
  });

  console.log(task.id);
} catch (error) {
  if (error instanceof TaskClientError) {
    switch (error.kind) {
      case 'validation':
        console.error('Fix the form values', error.issues);
        break;
      case 'http':
        console.error('Server rejected the request', error.status, error.error);
        break;
      default:
        console.error('Unexpected failure', error);
    }
  }
}
```

The helpers normalise query parameters (including multiple `tag` filters), coerce blank strings, and guard against
out-of-order date ranges before the request is issued.

## Testing utilities

The client exposes a `TaskClientRequestOptions.fetchImpl` override, making it straightforward to inject `vitest`/`jest`
mocks for unit tests. Server-only code paths can be exercised by temporarily removing `globalThis.window` or by wrapping
a test block with `withTaskClientAuth`.
