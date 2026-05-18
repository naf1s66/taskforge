# Database Migration Squash Before Production

TaskForge uses Prisma migrations as the database schema source of truth. During active development, keep migrations as timestamped, append-only folders under `apps/api/prisma/migrations` so `prisma migrate deploy` applies them in a deterministic order.

## Why Timestamped Folders Stay During Development

Prisma applies pending migrations in lexicographic directory order. Timestamp prefixes keep migration order explicit:

```text
20241005120000_auth_models
20241006120000_add_task_board_order
20260518230059_email_preferences_and_notification_delivery
```

Do not replace timestamped folders with descriptive-only names such as `email_preferences_and_notification_delivery`. A later timestamped migration would sort before the descriptive folder on a fresh database, which can make dependent migrations run before their tables or enums exist.

## When Squashing Is Allowed

Squashing is allowed only before the first real production database is created or before any shared long-lived environment depends on the current migration history.

After a migration has been applied to production, staging, or another shared persistent database, treat it as immutable. From that point forward, add new migrations instead of rewriting history.

## Pre-Production Squash Checklist

1. Confirm no production or shared persistent database has applied the existing migration history.
2. Back up any local/demo data that must be kept.
3. Reset a disposable local database and apply the current migration chain to confirm the schema is healthy.
4. Generate one new baseline migration from the final Prisma schema.
5. Replace the development migration folders with the baseline migration.
6. Apply the baseline to a fresh database using `pnpm -C apps/api prisma migrate deploy`.
7. Run `pnpm -C apps/api exec prisma generate`.
8. Run `pnpm -C apps/api tsx prisma/seed.ts` twice to confirm seed idempotency.
9. Run the full verification suite before deploying.

## Suggested Baseline Name

Use the same timestamped convention for the squashed baseline:

```text
20260601000000_initial_schema
```

The descriptive suffix can be clean and broad, but the timestamp prefix should remain because Prisma uses the folder name for ordering.

## Verification Commands

Run these from the repository root after creating the baseline:

```bash
pnpm -C apps/api exec prisma validate
pnpm -C apps/api exec prisma migrate deploy
pnpm -C apps/api exec prisma generate
pnpm -C apps/api tsx prisma/seed.ts
pnpm -C apps/api tsx prisma/seed.ts
pnpm -C apps/api run lint
pnpm -C apps/api run typecheck
pnpm -C apps/api test
pnpm -C apps/web run lint
pnpm -C apps/web run typecheck
pnpm -C apps/web test
make build
```

Use `prisma migrate deploy` for the production-like verification path. `prisma migrate dev` is useful while authoring migrations, but deploy parity should be checked with `migrate deploy`.
