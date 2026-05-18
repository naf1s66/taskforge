# Task: Update docs for Kanban and tags

## Summary
- Refresh PRD/README to describe the Kanban experience, tag strategy, and optimistic update behavior.
- Add diagrams or screenshots that help stakeholders understand the new flows.

**Status:** Done.

## Acceptance Criteria
- [x] PRD includes Kanban goals, success metrics, and UX notes that mirror the shipped implementation.
- [x] README gains setup/testing instructions for the board (e.g., enabling drag/drop in Docker, running the `.http` pack).
- [x] Any new decisions about tags/board ordering are captured in an ADR amendment or a new ADR, including the sorted-view drag behavior from `05-sorted-board-drag-rules.md`.

## Notes
- Linked the manual/automated test checklists so QA can validate Milestone 4 quickly.
- Embedded a lightweight mermaid sequence diagram for drag/drop + optimistic update lifecycle.
