# Task: Add automated tests for auth endpoints

## Summary
- Create .http smoke tests and Jest/Supertest coverage for register, login, logout, and protected resource access.
- Ensure the test suite runs in CI and covers both success and failure scenarios.

**Status:** Pending — CI run currently fails because the API responses omit the documented `token` field.

## Acceptance Criteria
- [x] `.http` files cover register/login/protected requests with sample payloads and expected responses.
- [x] Jest/Supertest tests exercise positive and negative cases for auth flows.
- [ ] Tests spin up any required Prisma test database fixtures and clean up between runs. *(Using isolated in-memory store for now; Prisma integration can replace it later without affecting the suite.)*
- [ ] CI job executes the new tests without flakiness.

## Notes
- Use seeded users or factories to avoid cross-test dependencies.
- Consider adding contract tests for token expiration/refresh behavior if implemented.
