# Task: Ship Kanban board endpoints

## Summary
- Expose REST endpoints that return the board read model and accept drag/drop updates for task status + position.
- Enforce auth + validation so only the owning user can mutate their board ordering.

**Status:** New.

## Acceptance Criteria
- [ ] `GET /api/taskforge/v1/board` (or equivalent) returns the board DTO with ETag/`updatedAt` metadata for caching.
- [ ] `PATCH /api/taskforge/v1/board/move` (or similar) validates payloads like `{ taskId, targetStatus, targetIndex }` and updates ordering atomically.
- [ ] Responses reuse shared DTOs and surface consistent error envelopes when validation fails.

## Notes
- Consider transactional updates (Prisma $transaction) when reordering so concurrent drags cannot corrupt indices.
- Document the endpoints in OpenAPI and add `.http` examples so QA can exercise the flows without the UI.
