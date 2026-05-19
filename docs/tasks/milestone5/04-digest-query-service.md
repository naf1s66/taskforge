# Task: Build daily digest query service

## Summary
- Create a reusable service that gathers the tasks a user should see in a daily digest.
- Group work by overdue, due today, due soon, recently updated, and blocked-by-status categories where useful.

**Status:** Completed.

## Acceptance Criteria
- [x] Digest query is user-scoped and never includes another user's tasks.
- [x] Service returns deterministic groups, counts, and task summaries suitable for email rendering.
- [x] Date windows are timezone-aware and covered by tests.
- [x] Query avoids N+1 reads and handles users with no digest-worthy tasks.

## Notes
- Reuse existing task repository filtering and board DTO concepts where they fit.
- Keep email payloads compact; do not include full markdown descriptions by default.

## Implementation Notes
- Added `DailyDigestQueryService` for user-scoped digest read models grouped by overdue, due today, due soon, recently updated, and still-todo tasks.
- Digest task summaries reuse board DTO mapping for compact email-safe fields and sorted tag labels without markdown descriptions.
- Date windows resolve from a persisted `dailyDigestTimezone` preference by default, allow explicit overrides for preview/testing, and use local calendar midnights so DST transitions do not skew daily buckets.
- The Prisma query filters to digest-relevant candidates and eager-loads tags in one read to avoid N+1 task/tag access.
