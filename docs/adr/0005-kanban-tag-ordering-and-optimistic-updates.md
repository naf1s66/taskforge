# ADR 0005 — Kanban Ordering, Tag Strategy, and Optimistic Move Semantics

**Status:** Accepted

## Context
Milestone 4 introduced the board endpoint surface, drag-and-drop UX, and reusable tags. We needed one documented policy that aligns product behavior, API payloads, and QA expectations, especially for sorted views where visible order is derived and not fully user-controlled.

## Decision
1. **Single move endpoint and payload remain stable**: keep `PATCH /api/taskforge/v1/tasks/board/move` with `{ taskId, targetStatus, targetIndex }` for both manual and sorted board modes.
2. **Two interaction modes**:
   - **Board order (manual):** same-column reorder + cross-column placement are enabled and persisted.
   - **Derived sort modes:** same-column reorder is disabled; cross-column drag updates status only from the user’s perspective.
3. **Deterministic hidden index in sorted mode**: cross-column moves in sorted views submit an end-of-lane `targetIndex`; the card is then rendered by the active sort after mutation/refetch.
4. **Optimistic first, safe rollback**: UI applies immediate optimistic cache changes, then rolls back on error and shows feedback.
5. **Tag strategy**: tags are user-scoped, unique by normalized label, and reused across task dialogs and filters to prevent taxonomy drift.

## Consequences
- UX is predictable: manual mode communicates precise ordering control, while sorted mode communicates status-only movement.
- API remains simple and backwards-compatible for clients and `.http` regression packs.
- QA can assert deterministic behavior across modes using one checklist + one move contract.
- Ordering and tag behavior now have a durable architectural record tied to Milestone 4.

## Related docs
- `docs/tasks/milestone4/05-sorted-board-drag-rules.md`
- `docs/tasks/milestone4/04-kanban-optimistic-updates.md`
- `docs/tasks/milestone4/06-tag-schema-and-api.md`
- `apps/api/tests/kanban.http`
