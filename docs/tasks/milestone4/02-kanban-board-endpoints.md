# Task: Ship Kanban board endpoints

## Summary
- Expose REST endpoints that return the board read model and accept drag/drop updates for task status + position.
- Enforce auth + validation so only the owning user can mutate their board ordering.

**Status:** Done.

## Acceptance Criteria
- [x] `GET /api/taskforge/v1/tasks/board` returns the board DTO with ETag/`updatedAt` metadata for caching.
- [x] `PATCH /api/taskforge/v1/tasks/board/move` validates payloads like `{ taskId, targetStatus, targetIndex }` and updates ordering atomically.
- [x] Responses reuse shared DTOs and surface consistent error envelopes when validation fails.

## Notes
- Consider transactional updates (Prisma $transaction) when reordering so concurrent drags cannot corrupt indices.
- Sorted-view drag behavior is tracked in `05-sorted-board-drag-rules.md`; the move endpoint should keep accepting a deterministic `targetIndex` even when the UI treats a move as status-only.
- Document the endpoints in OpenAPI and add `.http` examples so QA can exercise the flows without the UI.

## Implementation Notes
- Board routes are mounted under the task resource as `GET /api/taskforge/v1/tasks/board` and `PATCH /api/taskforge/v1/tasks/board/move`.
- Move mutations run in a Prisma transaction, lock affected board lanes, validate ownership, and return the refreshed board read model.
- OpenAPI and the Kanban `.http` pack document the canonical task-scoped route shape.
