# Milestone 6 Automated Checks

Use these checks while implementing security hardening, OpenAPI finalization, documentation refreshes, and CI Docker build coverage.

## Required Commands

```bash
pnpm -C apps/api lint
pnpm -C apps/api run lint:http
pnpm -C apps/api typecheck
pnpm -C apps/api test
pnpm -C apps/api gen:openapi
pnpm -C apps/web lint
pnpm -C apps/web typecheck
pnpm -C apps/web test
pnpm -C apps/api build
pnpm -C apps/web build
docker compose -f infra/docker-compose.yml config --quiet
docker build -f apps/api/Dockerfile -t taskforge-api:local .
docker build -f apps/web/Dockerfile -t taskforge-web:local .
git diff --check
```

If Docker is unavailable in the review environment, record that as an environment limitation and require CI or another release log to prove both image builds before Day 7 sign-off.

Docker image builds may print non-fatal optional native binding failures for transitive packages such as `cpu-features` or `ssh2` on Alpine when Python/compiler tooling is absent. Record the build as passed only if the command exits `0` and the requested image is exported/named.

## Focus Areas

- API security middleware and config parsing: Helmet, CORS, trusted proxy, body limits, cookies, and error handling.
- Web auth route checks: `/api/auth/*`, `/auth/session-bridge`, cron proxy auth, cookie-setting behavior, redirect sanitization, and dev bypass production gating. The web app should not grow general `/tasks`, `/tags`, or `/board` proxy routes; clients call the API directly.
- Rate limits: auth routes, email digest/manual send, protected jobs, global or route-specific limits, and the single-instance versus shared-store deployment decision.
- OpenAPI: regenerated `docs/openapi.json` must match `apps/api/src/openapi.ts`.
- HTTP packs: `pnpm -C apps/api run lint:http` must pass after any `.http` additions.
- Docker: compose config and API/web image builds must validate without real production secrets.
- Email safety: automated tests must use mocks, fakes, MailHog, or dry runs only.

## Suggested Focused Commands

```bash
pnpm -C apps/api test -- http-config.test.ts digest-config.test.ts jobs-route.test.ts email-digest-route.test.ts auth.e2e.test.ts
pnpm -C apps/web test -- app/api/cron/digest/route.test.ts
pnpm -C apps/api gen:openapi
pnpm -C apps/api run lint:http
```

## Expected Artifacts

- Updated task docs under `docs/tasks/milestone6/`.
- Updated manual checklist under `docs/testing/milestone6-manual-checklist.md`.
- Updated OpenAPI artifact only through `pnpm -C apps/api gen:openapi`.
- CI workflow changes when Docker build validation is added.
