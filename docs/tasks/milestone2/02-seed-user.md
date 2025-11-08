# Task: Seed demo auth user

## Summary
- Populate `prisma/seed.ts` with logic to create a deterministic demo user for authentication testing.
- Ensure the seed runs idempotently and aligns with password hashing requirements.

**Status:** Completed (merged).

## Acceptance Criteria
- [x] `prisma/seed.ts` creates at least one user with known credentials (and OAuth profile if applicable).
- [x] Running `pnpm -C apps/api tsx prisma/seed.ts` multiple times does not create duplicates or throw errors.
- [x] Seed uses the same hashing utilities as the registration flow.

## Notes
- Document the seeded credentials in README for QA and demo purposes.
- Consider seeding complementary data (e.g., default tasks) if it aids smoke testing protected routes.
