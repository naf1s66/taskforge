# Task: Update CI for auth test coverage

## Summary
- Adjust the GitHub Actions workflow so auth-related tests and migrations run during CI.
- Ensure secrets are handled securely and required services (e.g., database) are available for integration tests.

**Status:** Completed — CI now provisions Postgres, runs Prisma migrations, and executes the auth suites for API + web.

## Acceptance Criteria
- [x] CI workflow spins up database service or uses Prisma SQLite for auth tests.
- [x] Auth API and frontend tests execute as part of the pipeline and gate merges.
- [x] Any needed secrets are configured via GitHub Actions secrets or test-safe fallbacks.

## Notes
- Coordinate with new test suites to keep runtime reasonable.
- Update status badges or documentation if test commands change.
- `.github/workflows/ci.yml` defines a Postgres service, seeds `DATABASE_URL`, runs `pnpm --filter @taskforge/api exec prisma migrate deploy`, executes `pnpm -C apps/api test`, and runs `pnpm test --if-present` inside `apps/web`, all while pulling secrets from repository settings with safe fallbacks for forks.
