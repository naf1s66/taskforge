# Task: Audit security baseline

## Summary
- Inventory the security-sensitive behavior already shipped across API, web, Docker, CI, and production docs.
- Identify gaps before editing middleware so Milestone 6 work stays focused on release readiness.

**Status:** Completed.

## Acceptance Criteria
- [x] API middleware inventory covers Helmet, CORS, cookie parsing, request body limits, auth middleware, rate limits, trusted proxy behavior, and error handling.
- [x] Web inventory covers NextAuth session settings, API routes, the session-bridge route, cron proxy auth, cookie handling, and any dev-only bypass behavior.
- [x] Environment inventory covers required production values in `infra/env/*.example`, README, and production runbooks, and records documentation gaps as follow-up work.
- [x] Existing Milestone 5 email rollout gates remain explicit: real scheduled sends must stay disabled until production email facts are filled.
- [x] Findings are recorded as concrete follow-up edits in the relevant Milestone 6 task docs instead of broad notes.

## Audit Inventory

### API middleware and route security
- `apps/api/src/app.ts` initializes trust proxy from `getHttpServerConfig()`, then applies `express.json()`, `cookieParser()`, credentialed CORS, Helmet, and a global `express-rate-limit` limiter before public health/docs routes and protected API routers.
- CORS origin parsing already rejects invalid URLs, pathful origins, and empty entries in `apps/api/src/config/http.ts`; runtime CORS still has a development-only `localhost` wildcard and a production fallback origin, so Milestone 6 hardening must verify fallback behavior and tests before release.
- Request body limits are currently the Express JSON parser default because `express.json()` is called without an explicit `limit`; this is acceptable for the audit but must become an explicit follow-up for abuse-control work.
- Auth middleware accepts the HttpOnly API session cookie first, then `Authorization: Bearer`, and only falls back to `x-taskforge-dev-bypass` when the dev bypass is enabled with a client secret.
- Auth register/login/refresh/session-bridge routes have a 5-per-15-minute limiter outside `NODE_ENV=test`; digest preview/send routes add 10-per-minute and 3-per-minute controls, while task/tag/board mutations rely on the global limiter plus schema validation.
- Current rate limits use the default in-process `express-rate-limit` store, so production release work must either document a single API instance assumption or choose a shared store before horizontally scaling the API.
- Protected digest job routes are only registered when `DIGEST_JOB_SECRET` is configured and require either `Authorization: Bearer <secret>` or `x-job-secret`; missing/incorrect secrets return a generic `401`.
- Trusted proxy parsing supports boolean, hop count, named/subnet proxy lists, or disabled values, but Milestone 6 still needs tests proving `req.ip` behavior cannot be spoofed when rate limits are evaluated.
- No terminal Express error-handling middleware is registered in `createApp()`. Route handlers call `next(error)`, which currently falls through to Express defaults; release hardening should add/verify a structured non-secret error response.

### Web auth, proxy, cookies, and bypass behavior
- NextAuth uses the Prisma adapter, database sessions, `NEXTAUTH_SECRET`, `trustHost: true`, OAuth email normalization, and verified-email checks for Google sign-ins.
- Web route surfaces are limited to NextAuth, logout, `/api/auth/me`, `/auth/session-bridge`, and the digest cron proxy. There are no general task/tag API proxy routes; app data clients call the API base URL directly.
- `/api/cron/digest` validates `Authorization: Bearer <CRON_SECRET>`, requires `DIGEST_JOB_SECRET`, and forwards the request to the API job endpoint with `x-job-secret`.
- The web `/auth/session-bridge` route mints or refreshes the API session cookie for an authenticated web user, sanitizes the return path, probes existing API cookies, and sets the cookie as `httpOnly`, `sameSite: 'lax'`, `secure` in production, path `/`, seven-day max age, and optional `COOKIE_DOMAIN`; the API auth routes use matching cookie semantics.
- Logout performs an origin/referer check before calling the API logout endpoint with the cookie header and expiring the session cookie.
- `TF_DEV_BYPASS_AUTH` is gated to `NODE_ENV=development` or `test` in both API and web code; production examples keep it false and production docs explicitly require it to stay disabled.

### Environment, Docker, CI, and production docs
- `infra/env/api.prod.env.example` documents production API values for CORS, database, JWT secrets, session bridge, dev bypass disabled, SMTP/Resend, digest secret, `NODE_ENV=production`, `TRUST_PROXY`, and optional `COOKIE_DOMAIN`.
- `infra/env/web.prod.env.example` documents production web values for NextAuth, database/OAuth, session bridge, API base URLs, cron/digest secrets, dev bypass disabled, and optional `COOKIE_DOMAIN`.
- README documents the local and production meaning of `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_SECRET`, `DIGEST_JOB_SECRET`, `CRON_SECRET`, `COOKIE_DOMAIN`, and dev bypass variables. It does not yet list `TRUST_PROXY` in the environment reference, so the docs refresh task now tracks that concrete gap.
- CI currently supplies safe test secrets for JWT/session/NextAuth values, runs migrations and `make build`, but does not document or validate production CORS/trust-proxy behavior directly.
- Docker Compose uses the env examples for local services and MailHog; no production secret values are committed.

### Milestone 5 email rollout gates
- Production email rollout docs still require replacing every `<TBD before enablement>` production fact before real sends are enabled.
- Digest scheduler docs keep scheduled sends disabled until manual-only sends prove observability, Resend logs, delivery history, alerting, and quota visibility.
- Email observability ADR/runbook continue to require alerts and daily human review before scheduled sends are enabled.

## Concrete Follow-up Edits Recorded
- `docs/tasks/milestone6/02-cors-cookie-proxy-hardening.md`: added follow-ups for CORS fallback decisions, explicit cookie/session-bridge topology, `TRUST_PROXY` tests, README `TRUST_PROXY` docs, and API error handling.
- `docs/tasks/milestone6/03-rate-limit-and-abuse-controls.md`: added follow-ups for explicit body-size limits, concrete mutation/query bounds, endpoint-specific rate-limit coverage, job-secret negative tests, trusted-proxy/IP spoofing tests, and the in-process limiter scaling decision.
- `docs/tasks/milestone6/05-docs-adrs-readme-refresh.md`: added follow-ups to document `TRUST_PROXY`, production placeholders, no general web task/tag proxy, rate-limit deployment assumptions, and email scheduled-send gates.
- `docs/tasks/milestone6/07-security-http-pack-and-smoke.md`: added follow-ups for CORS/cookie/session-bridge manual checks, cron/job auth negative checks, and safe bounded rate-limit smokes.
- `docs/tasks/milestone6/08-milestone6-verification.md`: added release-gate checks that no audit follow-up remains only in this document, session-bridge behavior is covered, and production email gates remain explicit.

## Notes
- Treat previously completed Milestone 5 cleanup as input, not proof. Re-check the actual runtime paths and tests.
- Do not add new product behavior in this audit task.
- Keep any secret names documented, but never commit secret values.

## Verification
- `rg -n "CORS_ALLOWED_ORIGINS|TRUST_PROXY|CRON_SECRET|DIGEST_JOB_SECRET|NEXTAUTH_SECRET|COOKIE_DOMAIN|TF_DEV_BYPASS_AUTH|helmet|cors|cookie|rate|proxy|NextAuth|auth|body|error" apps infra README* docs -g '!node_modules'`
- `rg -n "JWT_SECRET|NEXTAUTH_SECRET|SESSION_BRIDGE_SECRET|CORS_ALLOWED_ORIGINS|DIGEST_JOB_SECRET|CRON_SECRET|TRUST_PROXY|COOKIE_DOMAIN|TF_DEV_BYPASS_AUTH|docker|compose|build" .github infra README.md docs/prod -g '!node_modules'`
- Reviewed `apps/api/src/app.ts`, `apps/api/src/config/http.ts`, `apps/api/src/routes/auth.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/jobs.ts`, `apps/api/src/routes/email-digest.ts`, `apps/web/app/api/**/route.ts`, `apps/web/app/auth/session-bridge/route.ts`, `apps/web/lib/auth-config.ts`, `apps/web/lib/server-auth.ts`, `apps/web/lib/session-bridge.ts`, `apps/web/lib/dev-auth-bypass.ts`, `infra/env`, README, CI, and `docs/prod`.
