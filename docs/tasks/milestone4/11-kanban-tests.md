# Task: Add automated tests for board + tags

## Summary
- Extend the API and frontend test suites to cover tag CRUD, filtered board queries, and drag/drop mutations.
- Ensure CI can run the new tests deterministically (mocking drag/drop as needed).

**Status:** New.

## Acceptance Criteria
- [ ] API tests seed tags/tasks, hit the board endpoints, and assert grouping + counts.
- [ ] Frontend tests (Playwright/React Testing Library) simulate drag/drop and verify optimistic updates roll back on failure.
- [ ] Frontend tests cover `05-sorted-board-drag-rules.md`: manual same-lane reorder, sorted same-lane drag disabled, and sorted cross-lane status move.
- [ ] CI executes the suites within acceptable time (<5 minutes) and reports flaky retries if they occur.

## Notes
- Consider contract tests that lock down the board DTO so backend/frontend stay in sync.
- Reuse the manual checklist to ensure automated coverage matches high-risk areas (moves, tag filters, optimistic rollbacks).
