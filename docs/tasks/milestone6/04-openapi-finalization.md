# Task: Finalize Swagger and OpenAPI

## Summary
- Make `apps/api/src/openapi.ts` and `docs/openapi.json` reflect the actual API surface before deployment.
- Ensure auth, task, tag, board, email, and job endpoints have accurate schemas, examples, and error responses.

**Status:** Planned.

## Acceptance Criteria
- [ ] OpenAPI includes all public API routes under `/api/taskforge/v1`.
- [ ] Security schemes accurately describe bearer auth, session cookie auth, and job secret auth where applicable.
- [ ] Request and response schemas match actual DTOs for auth, tasks, board, tags, email preferences, digest preview/send, and digest jobs.
- [ ] Error response shapes document validation errors, unauthorized responses, conflicts, rate limits, and service-unavailable cases.
- [ ] `pnpm -C apps/api gen:openapi` produces no uncommitted drift after generation.
- [ ] Swagger UI at `/api/taskforge/docs` renders in local development without runtime errors.

## Notes
- Do not manually edit `docs/openapi.json` except through the export script.
- Treat examples as contract examples, not placeholders with impossible values.
- Explicitly document optional scheduled digest `digestDate` behavior and per-user local digest dates.

## Verification
- `pnpm -C apps/api gen:openapi`
- `git diff -- docs/openapi.json`
- Local browser smoke of `/api/taskforge/docs`
