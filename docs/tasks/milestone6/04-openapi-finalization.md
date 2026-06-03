# Task: Finalize Swagger and OpenAPI

## Summary
- Make `apps/api/src/openapi.ts` and `docs/openapi.json` reflect the actual API surface before deployment.
- Ensure auth, task, tag, board, email, and job endpoints have accurate schemas, examples, and error responses.

**Status:** Completed - OpenAPI source and generated artifact now match the shipped API surface and verification passes without generated drift.

## Acceptance Criteria
- [x] OpenAPI includes all public API routes under `/api/taskforge/v1`.
- [x] Security schemes accurately describe bearer auth, session cookie auth, and job secret auth where applicable.
- [x] Request and response schemas match actual DTOs for auth, tasks, board, tags, email preferences, digest preview/send, and digest jobs.
- [x] Error response shapes document validation errors, unauthorized responses, conflicts, rate limits, and service-unavailable cases.
- [x] `pnpm -C apps/api gen:openapi` produces no uncommitted drift after generation.
- [x] Swagger UI at `/api/taskforge/docs` renders in local development without runtime errors.

## Notes
- Do not manually edit `docs/openapi.json` except through the export script.
- Treat examples as contract examples, not placeholders with impossible values.
- Explicitly document optional scheduled digest `digestDate` behavior and per-user local digest dates.

## Verification
- `pnpm -C apps/api gen:openapi`
- `git diff -- docs/openapi.json`
- `pnpm -C apps/api typecheck`
- `pnpm -C apps/web typecheck`
- `pnpm -C apps/api test`
- `pnpm -C apps/web test`
- Swagger UI smoke of `/api/taskforge/docs` and `/api/taskforge/docs/swagger-ui-init.js`
