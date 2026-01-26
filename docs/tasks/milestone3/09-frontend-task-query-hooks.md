# Task: Implement React Query hooks for tasks

## Summary
- Wrap the typed API client with React Query (or SWR) hooks that manage caching, loading states, optimistic updates, and background refetches.
- Provide mutations for create/update/delete so UI components can stay declarative.

**Status:** Complete.
**Concurrency:** Depends on `08-frontend-task-api-client`; can run in parallel with the UI tasks once the hooks are exported.

## Acceptance Criteria
- [x] `useTasksQuery` exposes `{ data, isLoading, error, refetch }` and respects filter parameters (status/tag/q).
- [x] Mutation hooks (`useCreateTask`, `useUpdateTask`, `useDeleteTask`) optimistically update the cache and roll back on failure.
- [x] Global error handling funnels toast-friendly messages to consumers.
- [x] Hooks documented in `docs/tasks/milestone3/sequence` (or README) so other teams know how to consume them.
- [x] Storybook or a small demo page shows the hooks in action for QA.

## Notes
- Consider namespacing the query keys by user id to avoid cache collisions when switching accounts.
- Keep suspense compatibility in mind for future server components.

## Implementation

- Added React Query-powered hooks in `apps/web/lib/tasks-hooks.ts` that wrap the typed API client. Hooks namespace query keys by user id, normalize filter parameters, and provide optimistic cache updates with rollback on errors.
- Introduced a shared React Query client in `apps/web/app/providers.tsx` so any client component can opt into the hooks.
- Exposed demo UI at `/tasks/hooks-demo` (see `apps/web/app/(protected)/tasks/hooks-demo/page.tsx`) that exercises listing, creating, updating, and deleting tasks using the new hooks.

## Usage

```tsx
import {
  useTasksQuery,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '@/lib/tasks-hooks';

const { tasks, isLoading, error, refetch } = useTasksQuery({ status: 'IN_PROGRESS' });
const createTask = useCreateTask();

createTask.mutate({
  title: 'Wireframe task filters',
  status: 'TODO',
  priority: 'MEDIUM',
});
```

Each hook surfaces a `friendly` error message (via the `error` property) that can be passed directly to toast/snackbar components while preserving the underlying error on `rawError` for logging.
