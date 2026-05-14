# Task: Build edit-task dialog

## Summary
- Reuse the create-form components to allow editing existing tasks, preloading data and syncing updates back to the list.
- Handle conflict states (task deleted elsewhere) gracefully.

**Status:** Completed.
**Concurrency:** Depends on `09` hooks/mutations and the list UI (so edit triggers exist); can run alongside the docs task.

## Acceptance Criteria
- [x] Dialog pre-fills selected task data and stays in sync if the query cache updates while it is open.
- [x] Submissions call `useUpdateTask`, optimistically update the cache, and handle API validation errors inline.
- [x] If the task no longer exists, the dialog closes with a toast explaining the situation.
- [x] Keyboard accessibility + focus management mirrors the create dialog.
- [x] README/docs mention how to launch the edit dialog and which fields are editable.

## Notes
- Consider adding a subtle "last updated" timestamp inside the dialog for additional context.
- Keep form state reusable so future subtasks (attachments, comments) can hook in.

## Implementation Notes
- `apps/web/components/tasks/task-dialog.tsx` reuses the create form for edit mode, preloads cached task data, and calls `useUpdateTask`.
- Edit triggers use `data-task-dialog="edit" data-task-id="<id>"`; the dashboard annotates each editable task card with those attributes.
