# Task: Build typed task API client

## Summary
- Create a lightweight HTTP client (`lib/tasks-client.ts`) that knows how to call `/api/taskforge/v1/tasks` endpoints with the user's `tf_session` cookie.
- Expose plain functions for list/create/update/delete plus shared error handling so hooks and components can reuse the same contract.

**Status:** Completed.
**Concurrency:** Blocked by the API endpoints (`02/03/04`); must land before the React Query/SWR hooks.

## Acceptance Criteria
- [x] Client automatically attaches auth headers/cookies when running on the client or server.
- [x] Functions return typed DTOs (leveraging `@taskforge/shared`) and throw structured errors for UI consumption.
- [x] Client performs minimal client-side validation via Zod before sending payloads.
- [x] README or `docs/AGENTS` includes a short section on how to consume the new client.
- [x] Unit tests cover serialization/response parsing edge cases (mocking fetch).

## Notes
- Keep the implementation framework-agnostic so it can also be used in server actions if needed.
- This module becomes the foundation for the upcoming React Query hooks.

## Implementation Notes
- `apps/web/lib/tasks-client.ts` exposes typed list/create/update/delete/board/tag functions with Zod validation and structured `TaskClientError` failures.
- `apps/web/lib/tasks-client.test.ts` covers serialization, credentials, validation, and response parsing edge cases.
