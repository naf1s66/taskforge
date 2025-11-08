# Task: Update OpenAPI for task CRUD

## Summary
- Document the full request/response schemas for `/tasks` operations, including filtering parameters and error envelopes.
- Ensure the exported spec matches the Prisma-backed implementation and ships with helpful examples.

**Status:** New.  
**Concurrency:** Blocked by `02/03/04` task endpoints; can run in parallel with the test work once schemas are stable.

## Acceptance Criteria
- [ ] `openapi.ts` (and the export script) describe list/create/update/delete responses with shared DTOs.
- [ ] Protected routes reference the bearer auth scheme and note required headers/cookies.
- [ ] Example payloads reflect realistic priorities, statuses, tags, and ISO timestamps.
- [ ] Swagger UI at `/api/taskforge/docs` renders without validation warnings.
- [ ] PRD/API docs sections reference the new `/tasks` capabilities and link back to the generated OpenAPI file.

## Notes
- Coordinate with the frontend team so component props align with the documented shapes.
- Remember to regenerate `docs/openapi.json` and commit it if the repo expects the artifact.
