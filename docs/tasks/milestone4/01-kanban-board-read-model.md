# Task: Define Kanban board read model

## Summary
- Shape a dedicated board-friendly read model that groups tasks by status lanes and preserves per-column ordering information.
- Surface tag metadata, due dates, and counts in each lane so the frontend can render summary chips without re-querying.

**Status:** New.

## Acceptance Criteria
- [ ] API exposes a `BoardColumn` DTO (status, title, ordering key, task list) plus board-level aggregates (totals per status, overdue counts).
- [ ] Repository/service layer fetches tasks + related tags in a single call and sorts them deterministically (e.g., status -> priority -> due date).
- [ ] Response contract is documented in shared types so both the API and Next.js app rely on the same interface.

## Notes
- Consider backing the read model with a SQL view or Prisma query helper that can be reused by both REST endpoints and future GraphQL/WebSocket layers.
- Keep payload lean enough for optimistic updates (no giant markdown bodies) while still carrying the metadata Kanban cells need.
