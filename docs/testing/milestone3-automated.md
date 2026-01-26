# Milestone 3 Automated Tasks Verification

Use these scripts/commands to validate the tasks experience (API + web) before opening a PR. Run them locally and ensure CI mirrors the same coverage.

## Command matrix
| Area | Command | Notes |
| --- | --- | --- |
| Install deps | `pnpm install` | Needed after pulling new lockfile changes. |
| Generate Prisma client | `pnpm --filter @taskforge/api exec prisma generate` | Safe to skip if `node_modules/.prisma` already matches, but required in clean environments. |
| Apply migrations | `pnpm --filter @taskforge/api exec prisma migrate deploy` | Aligns the schema for task tables; CI runs this step. |
| API lint/typecheck | `make lint` / `make typecheck` | Runs ESLint + `tsc --noEmit` across API and web. |
| API tests | `pnpm -C apps/api test` | Executes Jest + Supertest suite, including `tasks.e2e.test.ts`. Uses Testcontainers unless `DATABASE_URL` is set to a non-default DB. |
| Web tests | `pnpm -C apps/web test` | Runs Vitest coverage for the task client and hooks. |
| OpenAPI export | `pnpm -C apps/api run gen:openapi` or `make swagger` | Regenerate `docs/openapi.json` after task schema changes. |
| CI dry run | `make ci` | Optional local rehearsal of the full CI workflow. |

## Recommended workflow
1. `pnpm install`
2. `pnpm --filter @taskforge/api exec prisma generate`
3. `pnpm --filter @taskforge/api exec prisma migrate deploy`
4. `pnpm -C apps/api test`
5. `pnpm -C apps/web test`
6. `make lint && make typecheck`
7. `pnpm -C apps/api run gen:openapi` (if OpenAPI was updated)

## CI parity
- `.github/workflows/ci.yml` provisions Postgres, generates the Prisma client, applies migrations, runs lint/typecheck, and executes `pnpm -C apps/api test` plus `pnpm test --if-present` inside `apps/web`.
- Required secrets for CI parity: `CI_JWT_SECRET`, `CI_JWT_REFRESH_SECRET`, `CI_SESSION_BRIDGE_SECRET`, `CI_NEXTAUTH_SECRET`. Defaults are provided for local runs but should be configured in repo settings for staging/prod.

## Troubleshooting tips
- If the API tests hang, confirm Docker is running or set `DATABASE_URL` to a real Postgres instance to bypass Testcontainers.
- If migrations fail, reproduce with `pnpm --filter @taskforge/api exec prisma migrate deploy` and confirm the `DATABASE_URL` points at the intended schema.
- If OpenAPI diffs show up unexpectedly, rerun `make swagger` and commit the regenerated artifact.
