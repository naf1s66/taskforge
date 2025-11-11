# Milestone 2 Automated Auth Verification

Use these scripts/commands to continuously validate the auth stack. Run them locally before opening a PR and make sure CI mirrors the same coverage.

## Command matrix
| Area | Command | Notes |
| --- | --- | --- |
| Install deps | `pnpm install` | Needed after pulling new lockfile changes. |
| Generate Prisma client | `pnpm --filter @taskforge/api exec prisma generate` | Safe to skip if `node_modules/.prisma` already matches, but required in clean environments. |
| API lint/typecheck | `make lint` / `make typecheck` | Runs per-app ESLint + `tsc --noEmit` via Makefile. |
| API tests | `pnpm -C apps/api test` | Executes Jest + Supertest suite (`apps/api/tests/auth.e2e.test.ts`). Uses in-memory user store by default. |
| Web tests | `pnpm -C apps/web test` | Runs Vitest + Testing Library coverage for the auth forms (login happy/error flows). |
| Docker smoke | `make auth-smoke` | Reuses `apps/web/scripts/docker-auth-smoke.mjs` to validate register/login/bridge inside containers. |
| CI dry run | `pnpm exec turbo run build --filter=...` or `make ci` | Optional local rehearsal of the GitHub Actions steps. |

## Recommended workflow
1. `pnpm install`
2. `pnpm --filter @taskforge/api exec prisma migrate deploy`
3. `pnpm --filter @taskforge/api exec prisma generate`
4. `pnpm -C apps/api test`
5. `pnpm -C apps/web test`
6. `make lint && make typecheck`
7. `make auth-smoke` (only if Docker desktop is running)

## CI parity
- `.github/workflows/ci.yml` provisions Postgres, installs deps, runs Prisma generate + migrate, executes lint/typecheck, then runs `pnpm -C apps/api test` and `pnpm test --if-present` inside `apps/web`.
- Add new scripts to `package.json` (or `Makefile`) and update the workflow if the source of truth changes.
- Secrets: configure `CI_JWT_SECRET`, `CI_JWT_REFRESH_SECRET`, `CI_SESSION_BRIDGE_SECRET`, and `CI_NEXTAUTH_SECRET` in repository settings when running against anything besides the default dev values.

## Troubleshooting tips
- If Prisma migrations fail in CI, reproduce locally with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskforge?schema=public pnpm -C apps/api prisma migrate deploy`.
- Flaky Docker smoke tests often indicate the API container was still starting. Re-run `make auth-smoke` after `docker compose ps` shows `api` as healthy.
- When Google OAuth tests hang, verify `GOOGLE_ID/GOOGLE_SECRET` exist in the CI environment or mock the provider in your frontend tests.
