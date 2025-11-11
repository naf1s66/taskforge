# Task: Implement `/tasks` list & create endpoints

## Summary
- Wire `GET /api/taskforge/v1/tasks` and `POST /api/taskforge/v1/tasks` to the new Prisma repository so users see only their data and can create tasks.
- Keep request/response bodies aligned with the shared DTOs and surface validation errors via existing Zod schemas.

**Status:** New.  
**Concurrency:** Depends on `01-api-prisma-foundation`; runs in parallel with task update/delete work once the repository exists.

## Acceptance Criteria
- [ ] `GET /tasks` returns the authenticated user’s tasks ordered by `updatedAt DESC`, supports basic pagination scaffolding, and leverages the DTO mapper.
- [ ] `POST /tasks` persists a record for the signed-in user, applies default status/priority, and returns the saved DTO with timestamps and tags.
- [ ] Validation failures return 400 responses that mirror the auth error envelope for consistency.
- [ ] `.http` smoke files gain list/create examples that new contributors can run after `pnpm -C apps/api dev`.
- [ ] README/API docs mention the new endpoints plus required auth headers/cookies.

## Notes
- Make sure `tf_session` cookie auth is honored before hitting the repository.
- Consider logging task creation events so future analytics hooks have an obvious insertion point.
