# Task: Add optimistic updates and revalidation hooks

## Summary
- Mirror drag/drop changes locally before the API confirms them, then reconcile with the server response to prevent drift.
- Handle websocket-less invalidation by refetching the board (or affected columns) after mutations complete.

**Status:** Done.

## Acceptance Criteria
- [x] useMutation/useOptimistic (or equivalent) wraps board move calls and exposes rollback logic on failure.
- [x] Background refetch ensures the UI reconciles with canonical ordering after a mutation settles.
- [x] Toasts/tooltips explain when an optimistic move was rolled back so users understand what happened.

## Notes
- Track in-flight operations per task to avoid double-drags; disable cards while the server is still updating.
- Instrument with console/info logs (guarded for dev) so regressions are easier to trace.
- When `05-sorted-board-drag-rules.md` lands, optimistic updates should distinguish exact manual reorders from sorted-view status moves.

## Implementation Notes
- Board move mutations optimistically update the React Query board/list caches, rollback both caches on failure, and refetch the active board/list queries after settlement.
- Dashboard cards are disabled while their move is in flight, and retry actions reuse the same optimistic move and rollback path as the original drag.
- Sorted-view-specific drag semantics remain deferred to `05-sorted-board-drag-rules.md`.
