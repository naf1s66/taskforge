# Task: Add automated tests for board + tags

## Summary
- Extend the API and frontend test suites to cover tag CRUD, filtered board queries, and drag/drop mutations.
- Ensure CI can run the new tests deterministically (mocking drag/drop as needed).

**Status:** Done.

## Acceptance Criteria
- [x] API tests seed tags/tasks, hit the board endpoints, and assert grouping + counts.
- [x] Frontend tests (Playwright/React Testing Library) simulate drag/drop and verify optimistic updates roll back on failure.
- [x] Frontend tests cover `05-sorted-board-drag-rules.md`: manual same-lane reorder, sorted same-lane drag disabled, and sorted cross-lane status move.
- [x] CI executes the suites within acceptable time (<5 minutes) and reports flaky retries if they occur.

## Notes
- Consider contract tests that lock down the board DTO so backend/frontend stay in sync.
- Reuse the manual checklist to ensure automated coverage matches high-risk areas (moves, tag filters, optimistic rollbacks).

## Implementation Notes
- API coverage lives in `apps/api/tests/tasks.e2e.test.ts` and `apps/api/tests/tags.e2e.test.ts`, including tag-scoped fixtures, grouped board payloads, filtered board queries, and board move mutations.
- Frontend coverage lives in `apps/web/app/(protected)/dashboard/dashboard-content.test.tsx`; it mocks `@dnd-kit` at the boundary and drives the same drag handlers used by the dashboard for manual reorders, sorted status moves, disabled sorted same-lane moves, and rollback-to-toast behavior.
- `apps/web/lib/tasks-hooks.test.ts` locks down board cache snapshot restoration and filtered optimistic board updates so cached board variants stay in sync.
- CI runs the API and web suites through `.github/workflows/ci.yml`, with 5-minute per-suite timeouts. The runners do not enable automatic retries; if retry behavior is introduced later, the default Jest/Vitest output will surface retry attempts in the job log.
