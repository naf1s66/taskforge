# Task: Add Prisma and Postgres foundation

## Summary
- Configure Prisma against PostgreSQL and establish migration/seed workflows.
- Provide the database layer that later auth, task, tag, and board features depend on.

**Status:** Completed.

## Acceptance Criteria
- [x] `apps/api/prisma/schema.prisma` defines the datasource, generator, and initial models.
- [x] Prisma migration files are checked in under `apps/api/prisma/migrations`.
- [x] Seed script exists for deterministic local data.
- [x] API and web package scripts can generate Prisma clients when needed.

## Notes
- Keep migrations append-only and reviewed; avoid editing historical migrations after they have shipped.
- Use UUID primary keys for user-owned records to align with future hosted Postgres deployments.

## Implementation Notes
- Prisma schema and seed live under `apps/api/prisma`.
- Web scripts call Prisma generation against the API schema when the schema is present.
