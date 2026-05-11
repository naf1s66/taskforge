# Task: Build tag management UI

## Summary
- Provide a lightweight UI to create/select tags while composing or editing tasks and to show them on Kanban cards.
- Allow filtering by tag via chip toggles or multiselect near the board header.

**Status:** New.

## Acceptance Criteria
- [ ] Task dialogs (create/edit) let users attach/detach tags with debounced search + inline creation.
- [ ] Kanban cards render tag pills with accessible color contrast and tooltips when truncated.
- [ ] Filter controls update the board query parameters and trigger a refetch scoped to the selected tags.

## Notes
- Reuse shared form primitives and keep keyboard shortcuts (Enter to add tag, Backspace to remove) consistent.
- Cache tag lists client-side to avoid re-fetching on every keystroke; expire the cache when a new tag is created.
