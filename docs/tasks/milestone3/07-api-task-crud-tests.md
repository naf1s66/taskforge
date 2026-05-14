# Task: Cover task CRUD routes with Jest/Supertest

## Summary
- Implement end-to-end tests for list/create/update/delete + filter scenarios using the fixtures from `06-api-task-test-fixtures`.
- Guard against regressions such as cross-user access, validation failures, and tag propagation.

**Status:** Completed.
**Concurrency:** Depends on `02/03/04` endpoints and `06` test harness; can run alongside OpenAPI/docs work.

## Acceptance Criteria
- [x] Positive tests assert full payloads for create/list/update/delete along with tag + timestamp expectations.
- [x] Negative tests cover unauthorized requests, invalid payloads, 404 on other users' tasks, and filter misuse.
- [x] Tests assert that filtered queries (status/tag/q) only return matching rows.
- [x] CI executes the new suite via `pnpm -C apps/api test` and the run is documented in the Makefile/README.
- [x] Any new fixtures/examples are mirrored in the `.http` pack or README for manual verification.

## Notes
- Lean on `supertest.agent` to reuse cookies between requests.
- Keep runtimes reasonable by sharing a single Prisma connection per suite.

## Implementation Notes
- `apps/api/tests/tasks.e2e.test.ts` covers task CRUD, filters, validation, authorization, and ownership boundaries.
- `apps/api/tests/tasks.http` mirrors the manual CRUD/filter requests.
