# Task: Implement board filters and search

## Summary
- Layer quick filters (status, priority, due window, free-text) above the Kanban board so users can focus on relevant work.
- Persist filter state in the URL/query params for shareable views and deep links.

**Status:** New.

## Acceptance Criteria
- [ ] Filter controls sync with query params (e.g., `?status=IN_PROGRESS&tag=design`) and restore state on refresh.
- [ ] API honors the same filters server-side so the board only fetches matching tasks.
- [ ] Empty states communicate when filters hide all tasks and provide a reset action.

## Notes
- Align filter tokens with the `/tasks` list page so both surfaces share the same semantics and DTOs.
- Consider storing the last-used filter combo in localStorage to make returning to the board feel seamless.
