# Task: Implement authenticated task list UI

## Summary
- Render the authenticated user's tasks in a responsive list/kanban preview that mirrors the design system.
- Surface sorting, status chips, and empty states backed by the new `useTasks` client.

**Status:** Completed.
**Concurrency:** Blocked by `09-frontend-task-query-hooks`; can run alongside dialog work once hooks are available.

## Acceptance Criteria
- [x] `/dashboard` (or a dedicated `/tasks`) consumes `useTasksQuery` and renders task rows/cards with status + priority indicators.
- [x] Loading skeletons and empty-state illustrations match the existing visual language.
- [x] Errors from the hook display inline alerts with retry affordances.
- [x] UI includes entry points (buttons) for opening create/edit dialogs wired in the companion task.
- [x] Docs identify that approved screenshot assets are not committed yet and should be attached to PRs or added before external publishing.

## Notes
- Reuse shadcn/ui components (cards, badges, dropdowns) to reduce custom CSS.
- Keep layout accessible (keyboard focus, ARIA labels) since dialogs will rely on the same semantics.

## Implementation Notes
- `apps/web/app/(protected)/dashboard/dashboard-content.tsx` renders the authenticated dashboard with task cards, status/priority indicators, loading states, errors, and create/edit triggers.
- Screenshot artifacts remain a publishing handoff item rather than a committed repo artifact.
