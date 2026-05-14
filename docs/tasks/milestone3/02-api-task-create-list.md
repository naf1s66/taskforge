# Task: Implement `/tasks` list & create endpoints

## Summary
- Wire `GET /api/taskforge/v1/tasks` and `POST /api/taskforge/v1/tasks` to the new Prisma repository so users see only their data and can create tasks.
- Keep request/response bodies aligned with the shared DTOs and surface validation errors via existing Zod schemas.

**Status:** Completed.
**Concurrency:** Depends on `01-api-prisma-foundation`; runs in parallel with task update/delete work once the repository exists.

## Acceptance Criteria
- [x] `GET /tasks` returns the authenticated user's tasks ordered by `updatedAt DESC`, supports basic pagination scaffolding, and leverages the DTO mapper.
- [x] `POST /tasks` persists a record for the signed-in user, applies default status/priority, and returns the saved DTO with timestamps and tags.
- [x] Validation failures return 400 responses that mirror the auth error envelope for consistency.
- [x] `.http` smoke files gain list/create examples that new contributors can run after `pnpm -C apps/api dev`.
- [x] README/API docs mention the new endpoints plus required auth headers/cookies.

## Notes
- Make sure `tf_session` cookie auth is honored before hitting the repository.
- Consider logging task creation events so future analytics hooks have an obvious insertion point.

## Implementation Notes
- `apps/api/src/routes/tasks.ts` wires the list/create handlers through the Prisma task repository and auth middleware.
- `apps/api/tests/tasks.http` includes list/create examples, and `docs/openapi.json` documents the request and response shapes.
