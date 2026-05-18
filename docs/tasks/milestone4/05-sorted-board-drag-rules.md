# Task: Define sorted-board drag rules

## Summary
- Refine Kanban drag behavior when the board is sorted by anything other than manual board order.
- Preserve honest visual feedback: manual order supports exact placement, while derived sorts support status changes only.

**Status:** Done.

## Acceptance Criteria
- [x] Manual sort allows same-column reordering and cross-column moves that update both status and manual board order.
- [x] Non-manual sorts disable same-column dragging/reordering.
- [x] Non-manual sorts allow cross-column moves that update status only from the user's perspective.
- [x] Non-manual cross-column moves send a deterministic hidden `targetIndex` for storage, such as the end of the destination lane, but render the card according to the active sort after the mutation.
- [x] Drop states in non-manual sorts highlight the whole destination column instead of showing an exact insertion line.
- [x] Helper copy explains that sorted views place cards automatically and that manual order is required for custom reordering.

## Notes
- Example copy: `Sorted by Due Date. Cards are placed automatically after you move them. Switch to Board order to reorder cards yourself.`
- Keep keyboard and screen-reader announcements aligned with the current mode: reorder language for manual sort, status-move language for non-manual sorts.
- This task intentionally does not change the board move API shape. The existing `{ taskId, targetStatus, targetIndex }` payload remains valid.

## Implementation Notes
- Manual board order keeps the sortable card list so same-lane reorders and exact cross-lane placement remain visible and persisted.
- Derived sorts render cards as status-move draggables rather than sortable items. Same-lane drops do not reorder, cross-lane drops send an end-of-lane `targetIndex`, and the active sort controls the final visual position.
- Board reindexing only updates `updatedAt` on the moved task, so derived sorts such as Recently updated do not jump unrelated cards after a hidden board-order normalization.
