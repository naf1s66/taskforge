# Task: Build edit-task dialog

## Summary
- Reuse the create-form components to allow editing existing tasks, preloading data and syncing updates back to the list.
- Handle conflict states (task deleted elsewhere) gracefully.

**Status:** New.  
**Concurrency:** Depends on `09` hooks/mutations and the list UI (so edit triggers exist); can run alongside the docs task.

## Acceptance Criteria
- [ ] Dialog pre-fills selected task data and stays in sync if the query cache updates while it is open.
- [ ] Submissions call `useUpdateTask`, optimistically update the cache, and handle API validation errors inline.
- [ ] If the task no longer exists, the dialog closes with a toast explaining the situation.
- [ ] Keyboard accessibility + focus management mirrors the create dialog.
- [ ] README/docs mention how to launch the edit dialog and which fields are editable.

## Notes
- Consider adding a subtle “last updated” timestamp inside the dialog for additional context.
- Keep form state reusable so future subtasks (attachments, comments) can hook in.
