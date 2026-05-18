# Task: Build create-task dialog

## Summary
- Provide a modal dialog that lets users create tasks with client-side validation before calling the API.
- Reuse shared form components (input, textarea, date picker, tag selector) and hook into the create mutation.

**Status:** Completed.
**Concurrency:** Depends on `09` hooks/mutations; can run alongside the list and filter UI tasks.

## Acceptance Criteria
- [x] Dialog uses `react-hook-form` + Zod to validate title, priority, status, due date, and tags before submitting.
- [x] Successful submissions call `useCreateTask` and optimistically update the query cache/UI.
- [x] Errors show inline + toast feedback mapped from the API client.
- [x] Form controls meet accessibility requirements (labels, descriptions, keyboard focus trapping).
- [x] Documentation (README or docs/PRD) explains how to trigger the dialog and outlines required fields.

## Notes
- Coordinate with design to confirm animation + spacing so dialogs feel consistent with existing marketing sections.
- Stretch goal: allow tag suggestions via combobox seeded from `/tags` once available.

## Implementation Notes
- `apps/web/components/tasks/task-dialog.tsx` powers create submissions with React Hook Form, Zod, tag selection, inline errors, and toast feedback.
- `apps/web/components/tasks/task-dialog-host.tsx` opens the create dialog from `[data-task-dialog="create"]` triggers.
