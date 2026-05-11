# Task: Define sorted-board drag rules

## Summary
- Refine Kanban drag behavior when the board is sorted by anything other than manual board order.
- Preserve honest visual feedback: manual order supports exact placement, while derived sorts support status changes only.

**Status:** New.

## Acceptance Criteria
- [ ] Manual sort allows same-column reordering and cross-column moves that update both status and manual board order.
- [ ] Non-manual sorts disable same-column dragging/reordering.
- [ ] Non-manual sorts allow cross-column moves that update status only from the user's perspective.
- [ ] Non-manual cross-column moves send a deterministic hidden `targetIndex` for storage, such as the end of the destination lane, but render the card according to the active sort after the mutation.
- [ ] Drop states in non-manual sorts highlight the whole destination column instead of showing an exact insertion line.
- [ ] Helper copy explains that sorted views place cards automatically and that manual order is required for custom reordering.

## Notes
- Example copy: `Sorted by Due Date. Cards are placed automatically after you move them. Switch to Board order to reorder cards yourself.`
- Keep keyboard and screen-reader announcements aligned with the current mode: reorder language for manual sort, status-move language for non-manual sorts.
- This task intentionally does not change the board move API shape. The existing `{ taskId, targetStatus, targetIndex }` payload remains valid.
