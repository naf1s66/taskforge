# Task: Update docs for authenticated tasks dashboard

## Summary
- Capture the new backend + frontend task management flows in the PRD, README, and `.http` reference so contributors understand how to exercise them.
- Include screenshots/GIFs of the dashboard, filters, and dialogs for future onboarding.

**Status:** Completed.  
**Concurrency:** Runs after the UI tasks (10–13) so screenshots and descriptions reflect reality; can proceed while final tests wrap up.

## Acceptance Criteria
- [x] PRD “Tasks” section describes the end-to-end experience (filters, dialogs, tags) and links to the relevant ADRs.
- [x] README gains setup instructions for the task API (migrations, seeding, `.http` samples) plus UI usage notes.
- [x] `.http` pack includes fresh requests for list/create/update/delete with sample payloads.
- [x] Milestone docs/sequence file updated to reflect completion status of the new tasks.
- [x] Loom clip or screenshots will be linked once design approves assets.

## Notes
- Coordinate with design for approved assets before embedding them in docs; add final links once approved.
- Mention any known limitations (no pagination yet, etc.) so future milestones can pick them up.
