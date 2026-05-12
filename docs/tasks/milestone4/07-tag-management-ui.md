# Task: Build tag management UI

## Summary
- Provide a lightweight UI to create/select tags while composing or editing tasks and to show them on Kanban cards.
- Allow filtering by tag via chip toggles or multiselect near the board header.

**Status:** Done.

## Acceptance Criteria
- [x] Task dialogs (create/edit) let users attach/detach tags with debounced search + inline creation.
- [x] Kanban cards render tag pills with accessible color contrast and tooltips when truncated.
- [x] Filter controls update the board query parameters and trigger a refetch scoped to the selected tags.

## Notes
- Reuse shared form primitives and keep keyboard shortcuts (Enter to add tag, Backspace to remove) consistent.
- Cache tag lists client-side to avoid re-fetching on every keystroke; expire the cache when a new tag is created.

## Implementation Notes
- The dashboard tag filter syncs selected `tag` query parameters to the URL and fetches `/api/taskforge/v1/tasks/board` with repeated `tag` params so the board payload, lane counts, and summary all reflect the selected tags.
- Tag suggestions come from the Prisma-backed `/api/taskforge/v1/tags` endpoint and are cached through React Query. Selected URL tags are merged into the local options so deep links remain usable before suggestions load.
- The shared task tag selector supports Enter for inline tag creation and Backspace on an empty input to remove the last selected tag.
