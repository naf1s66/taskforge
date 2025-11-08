# Task: Update docs for authenticated tasks dashboard

## Summary
- Capture the new backend + frontend task management flows in the PRD, README, and `.http` reference so contributors understand how to exercise them.
- Include screenshots/GIFs of the dashboard, filters, and dialogs for future onboarding.

**Status:** New.  
**Concurrency:** Runs after the UI tasks (10–13) so screenshots and descriptions reflect reality; can proceed while final tests wrap up.

## Acceptance Criteria
- [ ] PRD “Tasks” section describes the end-to-end experience (filters, dialogs, tags) and links to the relevant ADRs.
- [ ] README gains setup instructions for the task API (migrations, seeding, `.http` samples) plus UI usage notes.
- [ ] `.http` pack includes fresh requests for list/create/update/delete with sample payloads.
- [ ] Milestone docs/sequence file updated to reflect completion status of the new tasks.
- [ ] Loom clip or screenshots stored under `docs/media` (or linked) demonstrating the dashboard and dialogs.

## Notes
- Coordinate with design for approved assets before embedding them in docs.
- Mention any known limitations (no pagination yet, etc.) so future milestones can pick them up.
