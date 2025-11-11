# Task: Build task test fixtures & harness

## Summary
- Prepare a reusable Jest/Supertest harness that spins up Prisma (SQLite or docker Postgres), seeds users/tasks, and exposes helper functions for upcoming CRUD suites.
- Ensure tests can obtain auth tokens/cookies without duplicating login logic.

**Status:** New.  
**Concurrency:** Blocked by `01` (repository) so the harness can call real data helpers; runs before individual CRUD suites.

## Acceptance Criteria
- [ ] `tests/setup.ts` (or equivalent) initializes a Prisma client pointed at an ephemeral DB and truncates tables between specs.
- [ ] Factory helpers (e.g., `createUser`, `createTask`) live under `apps/api/tests/utils` and return DTO-shaped objects.
- [ ] Auth helpers reuse the API register/login endpoints to obtain `tf_session` cookies for test clients.
- [ ] CI config documents the env vars (DATABASE_URL, JWT secrets) required to run the new harness.
- [ ] Test README/docs explain how to run the harness locally and troubleshoot DB resets.

## Notes
- Consider using `dotenv-flow` or a dedicated `.env.test` so local developers do not overwrite dev data.
- Keep fixture helpers framework-agnostic so we can re-use them in future integration or contract tests.
