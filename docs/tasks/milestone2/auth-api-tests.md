# Task: Add automated tests for auth endpoints

## Summary
- Create .http smoke tests and Jest/Supertest coverage for register, login, logout, and protected resource access.
- Ensure the test suite runs in CI and covers both success and failure scenarios.

## Acceptance Criteria
- [ ] `.http` files cover register/login/protected requests with sample payloads and expected responses.
- [ ] Jest/Supertest tests exercise positive and negative cases for auth flows.
- [ ] Tests spin up any required Prisma test database fixtures and clean up between runs.
- [ ] CI job executes the new tests without flakiness.

## Notes
- Use seeded users or factories to avoid cross-test dependencies.
- Consider adding contract tests for token expiration/refresh behavior if implemented.
