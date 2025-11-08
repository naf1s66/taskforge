# Task: Update CI for auth test coverage

## Summary
- Adjust the GitHub Actions workflow so auth-related tests and migrations run during CI.
- Ensure secrets are handled securely and required services (e.g., database) are available for integration tests.

**Status:** Pending — CI still skips database setup and does not execute the new auth suites.

## Acceptance Criteria
- [ ] CI workflow spins up database service or uses Prisma SQLite for auth tests.
- [ ] Auth API and frontend tests execute as part of the pipeline and gate merges.
- [ ] Any needed secrets are configured via GitHub Actions secrets or test-safe fallbacks.

## Notes
- Coordinate with new test suites to keep runtime reasonable.
- Update status badges or documentation if test commands change.
