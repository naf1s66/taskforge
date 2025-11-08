# Task: Implement React Query hooks for tasks

## Summary
- Wrap the typed API client with React Query (or SWR) hooks that manage caching, loading states, optimistic updates, and background refetches.
- Provide mutations for create/update/delete so UI components can stay declarative.

**Status:** New.  
**Concurrency:** Depends on `08-frontend-task-api-client`; can run in parallel with the UI tasks once the hooks are exported.

## Acceptance Criteria
- [ ] `useTasksQuery` exposes `{ data, isLoading, error, refetch }` and respects filter parameters (status/tag/q).
- [ ] Mutation hooks (`useCreateTask`, `useUpdateTask`, `useDeleteTask`) optimistically update the cache and roll back on failure.
- [ ] Global error handling funnels toast-friendly messages to consumers.
- [ ] Hooks documented in `docs/tasks/milestone3/sequence` (or README) so other teams know how to consume them.
- [ ] Storybook or a small demo page shows the hooks in action for QA.

## Notes
- Consider namespacing the query keys by user id to avoid cache collisions when switching accounts.
- Keep suspense compatibility in mind for future server components.
