# Task: Add optimistic updates and revalidation hooks

## Summary
- Mirror drag/drop changes locally before the API confirms them, then reconcile with the server response to prevent drift.
- Handle websocket-less invalidation by refetching the board (or affected columns) after mutations complete.

**Status:** New.

## Acceptance Criteria
- [ ] useMutation/useOptimistic (or equivalent) wraps board move calls and exposes rollback logic on failure.
- [ ] Background refetch ensures the UI reconciles with canonical ordering after a mutation settles.
- [ ] Toasts/tooltips explain when an optimistic move was rolled back so users understand what happened.

## Notes
- Track in-flight operations per task to avoid double-drags; disable cards while the server is still updating.
- Instrument with console/info logs (guarded for dev) so regressions are easier to trace.
