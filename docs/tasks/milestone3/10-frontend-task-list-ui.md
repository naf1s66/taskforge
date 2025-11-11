# Task: Implement authenticated task list UI

## Summary
- Render the authenticated user's tasks in a responsive list/kanban preview that mirrors the design system.
- Surface sorting, status chips, and empty states backed by the new `useTasks` client.

**Status:** New.  
**Concurrency:** Blocked by `09-frontend-task-query-hooks`; can run alongside dialog work once hooks are available.

## Acceptance Criteria
- [ ] `/dashboard` (or a dedicated `/tasks`) consumes `useTasksQuery` and renders task rows/cards with status + priority indicators.
- [ ] Loading skeletons and empty-state illustrations match the existing visual language.
- [ ] Errors from the hook display inline alerts with retry affordances.
- [ ] UI includes entry points (buttons) for opening create/edit dialogs wired in the companion task.
- [ ] Screenshots or Loom clip added to docs/README to illustrate the authenticated task list.

## Notes
- Reuse shadcn/ui components (cards, badges, dropdowns) to reduce custom CSS.
- Keep layout accessible (keyboard focus, ARIA labels) since dialogs will rely on the same semantics.
