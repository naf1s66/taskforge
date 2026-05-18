# Task: Build daily digest query service

## Summary
- Create a reusable service that gathers the tasks a user should see in a daily digest.
- Group work by overdue, due today, due soon, recently updated, and blocked-by-status categories where useful.

**Status:** New.

## Acceptance Criteria
- [ ] Digest query is user-scoped and never includes another user's tasks.
- [ ] Service returns deterministic groups, counts, and task summaries suitable for email rendering.
- [ ] Date windows are timezone-aware and covered by tests.
- [ ] Query avoids N+1 reads and handles users with no digest-worthy tasks.

## Notes
- Reuse existing task repository filtering and board DTO concepts where they fit.
- Keep email payloads compact; do not include full markdown descriptions by default.
