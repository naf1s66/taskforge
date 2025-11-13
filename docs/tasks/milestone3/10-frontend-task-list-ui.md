# Task: Implement authenticated task list UI

## Summary
- Render the authenticated user's tasks in a responsive list/kanban preview that mirrors the design system.
- Surface sorting, status chips, and empty states backed by the new `useTasks` client.

**Status:** Complete.
**Concurrency:** Blocked by `09-frontend-task-query-hooks`; can run alongside dialog work once hooks are available.

## Acceptance Criteria
- [x] `/dashboard` (or a dedicated `/tasks`) consumes `useTasksQuery` and renders task rows/cards with status + priority indicators.
- [x] Loading skeletons and empty-state illustrations match the existing visual language.
- [x] Errors from the hook display inline alerts with retry affordances.
- [x] UI includes entry points (buttons) for opening create/edit dialogs wired in the companion task.
- [x] Screenshots or Loom clip added to docs/README to illustrate the authenticated task list.

## Notes
- Reuse shadcn/ui components (cards, badges, dropdowns) to reduce custom CSS.
- Keep layout accessible (keyboard focus, ARIA labels) since dialogs will rely on the same semantics.
- Local preview bypass: run the web app with `ALLOW_UNAUTHENTICATED_PREVIEW=true` and `NEXT_PUBLIC_API_BASE_URL=/api/mock` to avoid hitting the authenticated API when taking screenshots or reviewing the mock UI.

## Artifacts

> _Authenticated task list preview available in the design handoff; binary assets are excluded from the repository._
