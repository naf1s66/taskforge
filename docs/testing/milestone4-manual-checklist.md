# Milestone 4 Manual Checklist — Kanban, Tags, Optimistic Moves

## Preconditions
- `make up` is running and both `api` + `web` containers are healthy.
- Seed or create at least 5 tasks spanning TODO / IN_PROGRESS / DONE.
- Create at least 3 tags and assign overlapping tags to tasks.

## Board order mode
- [ ] Drag within same column changes visible order and persists after refresh.
- [ ] Cross-column drag updates status and keeps dropped insertion position.
- [ ] Keyboard/screen-reader messaging uses reorder language in this mode.

## Sorted views mode
- [ ] Switch sort to Due date (or Priority/Updated).
- [ ] Same-column drag is blocked/disabled.
- [ ] Cross-column drag succeeds as a status move.
- [ ] Card final position follows active sort after mutation/refetch (not exact drop slot).
- [ ] Destination column-level highlight is shown instead of insertion-line marker.

## Optimistic + rollback behavior
- [ ] Successful drag updates UI immediately before network response completes.
- [ ] Simulated failure (invalid token / forced API error) restores prior card position.
- [ ] Error toast/message appears and user can retry move.

## Tags + filtering
- [ ] Creating a new tag makes it available in task dialogs and filters.
- [ ] Duplicate label variants (spacing/case) are rejected or normalized consistently.
- [ ] Filtering by tag narrows board/list to matching tasks only.
