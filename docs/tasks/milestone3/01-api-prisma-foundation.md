# Task: Establish Prisma task data foundation

## Summary
- Replace the ad-hoc in-memory store with a dedicated Prisma-backed `taskRepository` that scopes every read/write to the authenticated user.
- Centralize DTO ↔ Prisma conversions (tags, enums, timestamps) so subsequent API handlers and tests can reuse the same helpers.

**Status:** New.  
**Concurrency:** Blocks every other milestone-3 task; land this before touching any API route logic.

## Acceptance Criteria
- [ ] A new repository/service module exposes `listTasks`, `createTask`, `updateTask`, and `deleteTask` helpers that all require a `userId`.
- [ ] Repository methods normalize enums, tags, and ISO timestamps so downstream layers consume consistent DTOs.
- [ ] Shared DTO/types module exports any new interfaces needed for Prisma-backed records.
- [ ] README/ADR updates capture the switch from in-memory storage to Prisma for tasks, including any schema tweaks.
- [ ] Developer docs include guidance on running `pnpm -C apps/api prisma migrate dev` before exercising the new repository.

## Notes
- Reuse the seeded demo user for manual verification while CI runs against SQLite or a dockerized Postgres.
- Consider extracting lightweight mapping utilities so tests can stub Prisma without re-implementing DTO hygiene.
