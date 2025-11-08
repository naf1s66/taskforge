# Task: Build create-task dialog

## Summary
- Provide a modal dialog that lets users create tasks with client-side validation before calling the API.
- Reuse shared form components (input, textarea, date picker, tag selector) and hook into the create mutation.

**Status:** New.  
**Concurrency:** Depends on `09` hooks/mutations; can run alongside the list and filter UI tasks.

## Acceptance Criteria
- [ ] Dialog uses `react-hook-form` + Zod to validate title, priority, status, due date, and tags before submitting.
- [ ] Successful submissions call `useCreateTask` and optimistically update the query cache/UI.
- [ ] Errors show inline + toast feedback mapped from the API client.
- [ ] Form controls meet accessibility requirements (labels, descriptions, keyboard focus trapping).
- [ ] Documentation (README or docs/PRD) explains how to trigger the dialog and outlines required fields.

## Notes
- Coordinate with design to confirm animation + spacing so dialogs feel consistent with existing marketing sections.
- Stretch goal: allow tag suggestions via combobox seeded from `/tags` once available.
