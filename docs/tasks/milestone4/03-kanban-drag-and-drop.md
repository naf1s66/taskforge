# Task: Implement Kanban drag-and-drop interactions

## Summary
- Build the frontend drag-and-drop experience (e.g., using @dnd-kit or React Beautiful DnD) across TODO/IN_PROGRESS/DONE lanes.
- Ensure keyboard accessibility and visual affordances while dragging.

**Status:** Done.

## Acceptance Criteria
- [x] Columns render as drop zones with clear hover/drag states and announcement copy for screen readers.
- [x] Dragging between lanes triggers optimistic updates while the API move request runs.
- [x] Errors during a drag revert the UI gracefully and surface a toast/snackbar with retry guidance.

## Notes
- Reuse shadcn/ui cards/badges for task items so the board matches the rest of the design system.
- Provide sensible empty states per column ("Nothing in progress yet") so the board still feels polished without data.
- Follow-up behavior for sorted views is tracked separately in `05-sorted-board-drag-rules.md`.
