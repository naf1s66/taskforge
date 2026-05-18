# Milestone 4 Manual Checklist - Kanban, Tags, Optimistic Moves

Use this checklist for browser-level behavior that automated unit/integration tests cannot fully prove. Run it after the automated checks in `docs/testing/milestone4-automated.md`.

## Preconditions
- [ ] `make up` is running and `db`, `api`, `web`, and `mailhog` containers are healthy.
- [ ] Open `http://localhost:3000` in a host browser, not inside the container.
- [ ] Sign in with seeded/demo credentials or a fresh test user.
- [ ] Seed or create at least 6 tasks spanning `TODO`, `IN_PROGRESS`, and `DONE`.
- [ ] Include at least one overdue task, one due today/soon task, and one task without a due date.
- [ ] Create at least 3 tags and assign overlapping tags to tasks, including labels that vary by case/spacing.

## Board Read Model And Counts
- [ ] Dashboard lanes render `TODO`, `IN_PROGRESS`, and `DONE` with the expected cards.
- [ ] Lane counts match visible cards before filters are applied.
- [ ] Workspace summary text reports the unfiltered workspace total.
- [ ] Overdue indicators/counts match the seeded due dates.
- [ ] Refreshing the page preserves the canonical server order.

## Board Order Mode
- [ ] Select Board order/manual ordering mode.
- [ ] Drag within the same column and confirm the visible order changes immediately.
- [ ] Refresh the page and confirm the same-column order persists.
- [ ] Drag a card across columns and confirm status changes plus dropped insertion position persist after refresh.
- [ ] While a move is in flight, confirm the moved card cannot be dragged again.
- [ ] Keyboard drag/reorder language describes reordering, not just status movement.

## Sorted Views Mode
- [ ] Switch sort to Due date.
- [ ] Confirm same-column drag/reorder is blocked or no-ops.
- [ ] Drag a card across columns and confirm status changes.
- [ ] Confirm the final card position follows Due date sort after mutation/refetch, not the exact drop slot.
- [ ] Repeat cross-column movement in Priority sort.
- [ ] Repeat cross-column movement in Recently updated sort.
- [ ] Confirm destination columns show column-level highlight instead of exact insertion-line markers.
- [ ] Confirm helper copy tells users to switch to Board order for manual placement.

## Filters, Search, And URL Persistence
- [ ] Apply a status filter and confirm only matching lanes/cards remain visible.
- [ ] Apply a priority filter and confirm board and list semantics match.
- [ ] Apply one tag filter and confirm matching tasks remain visible.
- [ ] Apply multiple tag filters and confirm repeated `tag` query params appear in the URL.
- [ ] Apply text search and confirm matching title/tag content is shown.
- [ ] Apply Today/Next 7 days due filters and confirm URL/API due range behavior.
- [ ] Refresh with filters active and confirm the same filtered view is restored.
- [ ] Clear filters and confirm URL, localStorage-backed state, counts, and visible cards reset.
- [ ] With filters active, drag a visible card in Board order and confirm it lands in the correct full-lane position after clearing filters.
- [ ] Confirm filtered empty state distinguishes "no matches" from an empty workspace and offers reset.

## Optimistic Updates And Rollback
- [ ] Throttle the network or use a debug failure path to observe optimistic movement before the API response.
- [ ] Simulate a failed board move and confirm the card returns to its prior lane/position.
- [ ] Confirm the destructive toast explains the failure and exposes a retry action.
- [ ] Retry the failed move after restoring the network/session and confirm success.
- [ ] Confirm board/list caches reconverge after refresh.

## Tags And Task Dialogs
- [ ] Create a new tag in the create-task dialog and confirm it appears on the card.
- [ ] Create or select tags in the edit-task dialog and confirm card pills update after save.
- [ ] Try spacing/case variants of an existing tag and confirm they normalize to one canonical label.
- [ ] Create a tag that is a substring of an existing tag, such as `api` when `api-v2` exists.
- [ ] Confirm exact duplicate tag creation is not offered.
- [ ] Confirm Backspace on an empty tag input removes the last selected tag.
- [ ] Confirm tag filter suggestions include newly created tags without a full page reload.
- [ ] Confirm tag pills remain readable in light and dark UI states.

## HTTP Pack Smoke
- [ ] Run login/register flow from `apps/api/tests/auth.http` or otherwise capture a valid token/cookie.
- [ ] Run board fetch from `apps/api/tests/kanban.http`.
- [ ] Run board move from `apps/api/tests/kanban.http`.
- [ ] Run tag list/create flows from `apps/api/tests/kanban.http`.
- [ ] Confirm examples use environment variables and no real secrets.

## Accessibility And Browser Checks
- [ ] Navigate primary board controls with keyboard only.
- [ ] Confirm focus is visible on cards, filters, dialogs, and retry actions.
- [ ] Confirm dialog validation errors are announced or associated with their fields.
- [ ] Confirm toast/error messaging is visible and does not overlap critical board controls.
- [ ] Inspect at a narrow mobile viewport and confirm board/filter text does not overlap.

## Completion Notes
- [ ] Capture any failed step with browser, viewport, active filters, task ids/titles, and console/network logs.
- [ ] File a follow-up task for any manual-only issue that is intentionally deferred.
- [ ] Do not mark Milestone 4 ready if automated checks fail or if manual drag/drop persistence fails.
