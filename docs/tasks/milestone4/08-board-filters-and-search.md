# Task: Implement board filters and search

## Summary
- Layer quick filters (status, priority, due window, free-text) above the Kanban board so users can focus on relevant work.
- Persist filter state in the URL/query params for shareable views and deep links.

**Status:** Done.

## Acceptance Criteria
- [x] Filter controls sync with query params (e.g., `?status=IN_PROGRESS&tag=design`) and restore state on refresh.
- [x] API honors the same filters server-side so the board only fetches matching tasks.
- [x] Empty states communicate when filters hide all tasks and provide a reset action.

## Implementation Notes
- Board filters now share the `/tasks` list semantics for `status`, `priority`, repeated `tag`, `q`, `dueFrom`, and `dueTo` query parameters.
- The dashboard may also write a UI-only `dueWindow` token for quick selections such as today or the next 7 days; canonical API filtering still uses `dueFrom` and `dueTo`.
- The dashboard stores the last-used filter combo in `localStorage` when the URL has no explicit query, and reset clears all filter tokens.
- Filtered empty states distinguish zero matching results from a genuinely empty workspace.

## Notes
- Align filter tokens with the `/tasks` list page so both surfaces share the same semantics and DTOs.
- Consider storing the last-used filter combo in localStorage to make returning to the board feel seamless.
- Keep filter behavior consistent with `05-sorted-board-drag-rules.md`: derived views can move cards across statuses, but should not imply manual placement.
