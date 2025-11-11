# Task: Implement JWT verification middleware

## Summary
- Replace the placeholder auth middleware with JWT verification that decodes and validates tokens on protected routes.
- Attach the authenticated user context to the request for downstream handlers.

**Status:** Completed (merged).

## Acceptance Criteria
- [x] Middleware verifies signature, expiration, and revocation status of incoming tokens.
- [x] Requests with missing or invalid tokens receive a 401 response with a consistent error body.
- [x] Valid tokens result in `req.user` (or equivalent) being populated for route handlers.
- [x] Middleware is applied to protected routes without blocking public endpoints.

## Notes
- Consider supporting both access and refresh tokens depending on auth flow design.
- Coordinate with frontend/NextAuth session handling to ensure compatibility with API expectations.
