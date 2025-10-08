# Task: Implement JWT authentication endpoints

## Summary
- Build REST endpoints for register, login, logout, and current-user retrieval under `/auth/*`.
- Issue and revoke JWT access/refresh tokens according to the security requirements.

## Acceptance Criteria
- [ ] `/auth/register`, `/auth/login`, `/auth/logout`, and `/auth/me` routes exist and are wired into the Express router.
- [ ] Successful registration and login return signed JWTs and relevant user payloads.
- [ ] Logout invalidates refresh tokens/server-side session state as required.
- [ ] `/auth/me` returns the authenticated user when provided a valid token and rejects invalid/expired tokens.

## Notes
- Ensure parity with the frontend auth flow (NextAuth/custom client) and document the response shapes in shared DTOs.
- Use environment-provided secrets for token signing; avoid hard-coded secrets in code.
