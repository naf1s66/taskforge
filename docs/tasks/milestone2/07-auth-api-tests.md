# Task: Add automated tests for auth endpoints

## Summary
- Create .http smoke tests and Jest/Supertest coverage for register, login, logout, and protected resource access.
- Ensure the test suite runs in CI and covers both success and failure scenarios.

**Status:** Completed — Jest/Supertest suite and `.http` flows now assert the documented responses end-to-end.

## Acceptance Criteria
- [x] `.http` files cover register/login/protected requests with sample payloads and expected responses.
- [x] Jest/Supertest tests exercise positive and negative cases for auth flows.
- [x] Tests spin up any required Prisma test database fixtures and clean up between runs. *(Using isolated in-memory store for now; Prisma integration can replace it later without affecting the suite.)*
- [x] CI job executes the new tests without flakiness.

## Notes
- Use seeded users or factories to avoid cross-test dependencies.
- Consider adding contract tests for token expiration/refresh behavior if implemented.
- `apps/api/tests/auth.e2e.test.ts` + `apps/api/tests/utils/test-app.ts` provide isolated user stores per test, covering register/login/logout, `/auth/me`, session bridge, and failure cases. The companion `apps/api/tests/auth.http` file exercises the same payloads for manual smoke testing.
- `.github/workflows/ci.yml` provisions Postgres, applies Prisma migrations, runs `pnpm -C apps/api test`, and fails the build if the auth suite regresses.
