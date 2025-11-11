# Task: Establish Prisma task data foundation

## Summary
- Replace the ad-hoc in-memory store with a dedicated Prisma-backed `taskRepository` that scopes every read/write to the authenticated user.
- Centralize DTO ↔ Prisma conversions (tags, enums, timestamps) so subsequent API handlers and tests can reuse the same helpers.

**Status:** Completed.
**Concurrency:** Blocks every other milestone-3 task; land this before touching any API route logic.

## Acceptance Criteria
- [x] A new repository/service module exposes `listTasks`, `createTask`, `updateTask`, and `deleteTask` helpers that all require a `userId`.
- [x] Repository methods normalize enums, tags, and ISO timestamps so downstream layers consume consistent DTOs.
- [x] Shared DTO/types module exports any new interfaces needed for Prisma-backed records.
- [x] README/ADR updates capture the switch from in-memory storage to Prisma for tasks, including any schema tweaks.
- [x] Developer docs include guidance on running `pnpm -C apps/api prisma migrate dev` before exercising the new repository.

## Notes
- Reuse the seeded demo user for manual verification while CI runs against SQLite or a dockerized Postgres.
- Consider extracting lightweight mapping utilities so tests can stub Prisma without re-implementing DTO hygiene.

## Implementation Notes
- Added `apps/api/src/repositories/task-repository.ts` with Prisma-backed helpers plus shared mapping utilities (`task-mapper.ts`) that normalize enums, ISO timestamps, and tag order.
- Updated `packages/shared/src/index.ts` to export `TaskRecordDTO`, giving downstream layers typed access to persisted metadata.
- `createApp` now accepts an injected `taskRepository`, enabling Jest to swap in the in-memory test double defined in `apps/api/tests/utils/in-memory-task-repository.ts`.
- Developer docs call out `pnpm -C apps/api prisma migrate dev` as the default local workflow so the new repository has its tables before exercising `/tasks` endpoints.
