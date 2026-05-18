# Task: Add initial docs and ADRs

## Summary
- Capture the product scope, architecture direction, and local setup expectations early.
- Record decisions that later milestone work can refer back to instead of reopening basic architecture questions.

**Status:** Completed.

## Acceptance Criteria
- [x] README explains local setup, workspace commands, Docker usage, and verification entrypoints.
- [x] PRD documents the product goal, scope, architecture, API direction, data model sketch, and milestone plan.
- [x] ADRs exist for auth strategy, database choice, email direction, and hosting direction.
- [x] Docs use stable links to task, testing, OpenAPI, and architecture references where available.

## Notes
- Treat docs as living records; milestone-specific docs should update the PRD/README when shipped behavior changes.
- ADRs should be amended or superseded when implementation materially deviates from the decision.

## Implementation Notes
- Product scope lives in `docs/PRD.md`.
- Architecture decisions live in `docs/adr`.
- Contributor and agent guidance lives in `docs/AGENTS.md`.
