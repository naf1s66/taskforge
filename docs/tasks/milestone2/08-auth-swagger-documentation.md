# Task: Document auth routes in Swagger/OpenAPI

## Summary
- Extend the OpenAPI document to describe all authentication endpoints, request/response bodies, and security schemes.
- Surface the documentation in Swagger UI under `/api/taskforge/docs`.

**Status:** Blocked — schemas still describe a `token` field the API does not return.

## Acceptance Criteria
- [x] OpenAPI spec defines JWT bearer security scheme and references it on protected routes.
- [ ] Auth endpoints include accurate schemas for success and error responses.
- [x] Swagger UI displays the new routes without validation errors.
- [x] OpenAPI export script updated to include auth definitions.

## Notes
- Coordinate with shared DTOs so schema definitions stay DRY.
- Consider adding examples for common responses to improve developer experience.
