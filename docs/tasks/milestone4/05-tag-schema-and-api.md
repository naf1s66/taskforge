# Task: Finalize tag schema and API contract

## Summary
- Promote the temporary in-memory `/tags` route to a Prisma-backed implementation that supports create/list and future delete/rename hooks.
- Ensure tags can be joined onto tasks and filtered via query params.

**Status:** New.

## Acceptance Criteria
- [ ] Prisma migrations cover `Tag` + `TaskTag` tables with uniqueness constraints and cascading deletes.
- [ ] `GET /api/taskforge/v1/tags` returns label + usage counts for the authenticated user.
- [ ] `POST /api/taskforge/v1/tags` validates payloads, normalizes casing, and returns the canonical record.

## Notes
- Consider debouncing create requests from the UI so accidental double-submits do not create duplicates.
- Share types through `packages/shared` so the API, web client, and seed scripts agree on tag shapes.
