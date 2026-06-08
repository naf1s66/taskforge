# Task: Run Milestone 6 release-readiness verification

## Summary
- Run the final automated and manual checks for the security/docs/CI hardening milestone.
- Record residual risks before moving to Day 7 deployment.

**Status:** Completed - final automated gates and local Docker/manual smokes passed on 2026-06-05.

## Acceptance Criteria
- [x] All commands in `docs/testing/milestone6-automated.md` pass or have an explicit documented blocker.
- [x] Manual checks in `docs/testing/milestone6-manual-checklist.md` are completed for local Docker and, if available, a preview deployment.
- [x] `docs/openapi.json` has no uncommitted drift after generation.
- [x] Docker build/compose validation has passed in CI or an equivalent local run is documented.
- [x] Release-candidate docs list remaining Day 7 deployment steps and production email gates.
- [x] Any unresolved issues are converted into follow-up task docs or release blockers, not buried in chat history.

## Notes
- This task should be the last Milestone 6 task before deployment provisioning starts.
- Do not merge into Day 7 with unknown test failures or undocumented environment requirements.

## Verification
- Use `docs/testing/milestone6-automated.md` as the command source of truth.
- Use `docs/testing/milestone6-manual-checklist.md` for browser and deployment-path checks.

## Final Verification Evidence

Automated checks run locally on 2026-06-05:

- `pnpm -C apps/api lint`
- `pnpm -C apps/api run lint:http`
- `pnpm -C apps/api typecheck`
- `pnpm -C apps/api test` - 15 suites, 167 tests passed.
- `pnpm -C apps/api gen:openapi`
- `git diff -- docs/openapi.json` - no generated drift.
- `pnpm -C apps/web lint`
- `pnpm -C apps/web typecheck`
- `pnpm -C apps/web test` - 16 files, 87 tests passed after the local auth/session-bridge fixes.
- `pnpm -C apps/api build`
- `pnpm -C apps/web build`
- `docker compose -f infra/docker-compose.yml config --quiet`
- `docker build -f apps/api/Dockerfile -t taskforge-api:local .`
- `docker build -f apps/web/Dockerfile -t taskforge-web:local .`
- `git diff --check`

Local Docker/manual smokes run against the rebuilt compose stack:

- `make up` rebuilt and restarted API/web services from this branch.
- `docker compose -f infra/docker-compose.yml exec -T api pnpm prisma migrate deploy` reported no pending migrations.
- `docker compose -f infra/docker-compose.yml exec -T api pnpm tsx prisma/seed.ts` completed.
- `docker compose -f infra/docker-compose.yml ps` showed API, web, Postgres, and MailHog running; Postgres was healthy.
- `curl http://localhost:4000/api/taskforge/v1/health` returned `200` with Helmet/security headers.
- `curl http://localhost:3000/login` returned `200`.
- `make auth-smoke` passed after rebuilding the Docker web service, including register/login/session-bridge behavior.
- Signed-out `/auth/session-bridge?from=/dashboard` returned `307`, `Cache-Control: no-store`, and `Location: /login?from=%2Fdashboard&reason=session-bridge`.
- Signed-out `/auth/session-bridge?from=%2F%2Fevil.example%2Fdashboard` returned `307`, `Cache-Control: no-store`, and sanitized `Location: /login?from=%2F&reason=session-bridge`.
- Missing and incorrect API `DIGEST_JOB_SECRET` smokes returned `401` for GET bearer and POST `x-job-secret` paths.
- Missing and incorrect web `CRON_SECRET` smokes returned `401`.
- Local browser-origin API preflight returned `204` with `Access-Control-Allow-Origin: http://localhost:3000`, credentials, methods, and requested headers.
- Unlisted-origin API request returned `403` with `{"error":"CORS origin denied"}`.
- Swagger UI at `/api/taskforge/docs/` returned `200`.
- Missing auth on `/api/taskforge/v1/tasks` returned `401`.
- Bounded auth rate-limit smoke returned `429` on attempt 6 and stopped.

No preview deployment was available in this local workspace. Day 7 must repeat the deployed-browser parts of `docs/testing/milestone6-manual-checklist.md` after the web, API, and database are provisioned.

## Baseline Audit Follow-ups
- Every follow-up from `01-security-baseline-audit.md` is either completed by Milestone 6 tasks 02-07 or remains an explicit release/deployment gate in `README.md`, `docs/PRD.md`, `docs/prod/README.md`, `docs/prod/browser-auth-deployment.md`, `docs/prod/email-production-rollout.md`, and `docs/prod/adr/0008-release-candidate-security-and-deployment-gates.md`.
- The required security-sensitive `rg` inventory was rerun for `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY`, `CRON_SECRET`, `DIGEST_JOB_SECRET`, `NEXTAUTH_SECRET`, `COOKIE_DOMAIN`, and `TF_DEV_BYPASS_AUTH`. No undocumented production requirement was found.
- `/auth/session-bridge` is covered by unit tests, local Docker auth smoke, signed-out redirect checks, redirect sanitization checks, API-cookie minting smoke, and no-cache header checks.
- Production email scheduled sends remain disabled unless all production fact-register placeholders are filled and manual-only Resend/observability checks pass.
- Remaining `<TBD before enablement>` values are intentional Day 7/pre-launch production email facts, not hidden Milestone 6 requirements.

## Current Release-Candidate State
- Documentation gates for README, PRD, ADRs, production placeholders, and Milestone 6 testing references have been refreshed.
- Final automated command execution and local Docker/manual smoke have passed locally; preview/deployed-browser smoke remains a Day 7 provisioning gate because no preview deployment was available for this verification run.
- Docker image-build evidence is covered by local compose validation plus local API/web image builds; CI also contains compose and API/web image build steps with safe placeholder values.
- Production email scheduled sends remain disabled unless all production fact-register placeholders are filled and manual-only Resend/observability checks pass.

## Release Notes And Residual Risks
- CORS no longer has a production fallback origin; Day 7 must set exact deployed web origins in `CORS_ALLOWED_ORIGINS`.
- Trusted proxy behavior is explicit; Day 7 must set `TRUST_PROXY` only to the actual platform proxy chain.
- v1 rate limits use in-process state; run one API instance or add a shared limiter store before horizontal scaling.
- JSON body/query/mutation bounds are implemented and documented; keep `API_JSON_BODY_LIMIT=64kb` unless a reviewed production need requires a larger cap.
- `/auth/session-bridge` avoids unsupported local placeholder NextAuth providers, uses relative same-site redirects, sanitizes unsafe `from` paths, remains `no-store`, and is covered by unit tests plus local Docker smoke.
- Structured API errors are implemented for the checked routes; continue treating HTML/stack responses from API routes as release blockers if any new route is added.
- Production scheduled email sends remain disabled until every `<TBD before enablement>` in `docs/prod/email-production-rollout.md` is replaced and manual-only Resend/observability checks pass.
