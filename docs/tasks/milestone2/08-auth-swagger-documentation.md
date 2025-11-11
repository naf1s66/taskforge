# Task: Document auth routes in Swagger/OpenAPI

## Summary
- Extend the OpenAPI document to describe all authentication endpoints, request/response bodies, and security schemes.
- Surface the documentation in Swagger UI under `/api/taskforge/docs`.

**Status:** Completed — OpenAPI doc + Swagger UI now reflect the shipped auth payloads/cookies.

## Acceptance Criteria
- [x] OpenAPI spec defines JWT bearer security scheme and references it on protected routes.
- [x] Auth endpoints include accurate schemas for success and error responses.
- [x] Swagger UI displays the new routes without validation errors.
- [x] OpenAPI export script updated to include auth definitions.

## Notes
- Coordinate with shared DTOs so schema definitions stay DRY.
- Consider adding examples for common responses to improve developer experience.
- `apps/api/src/openapi.ts` documents the auth router, shared JWT bearer scheme, cookie behavior, and error shapes; `/api/taskforge/docs` renders without validation errors after running `pnpm -C apps/api dev`.
- Update the spec (and export via `pnpm -C apps/api run gen:openapi`) whenever DTOs change so this task stays satisfied.
