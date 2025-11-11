# Task: Expand Prisma auth models and migrations

## Summary
- Define comprehensive Prisma models for authentication, including persistent `Session`/`Account` equivalents needed by the auth strategy.
- Generate and check in the initial migration(s) so the database includes the new auth tables.

**Status:** Completed (merged).

## Acceptance Criteria
- [x] `schema.prisma` includes user-auth related models that support both credential and OAuth flows (e.g., `Session`, `Account`, verification tokens as required).
- [x] Prisma migration files reflecting the new models are generated and committed.
- [x] Local database can be migrated without errors using `pnpm -C apps/api prisma migrate dev`.

## Notes
- Align model shapes with the decisions captured in ADR 0001 (NextAuth + backend JWT interoperability).
- Coordinate with seeding and auth endpoint work so schema changes are reflected across the stack.
