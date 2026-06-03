# Milestone 6 Manual Checklist

Use this checklist after the automated checks in `docs/testing/milestone6-automated.md`.

## Local Preconditions

- [ ] `make up` or the documented local stack is running.
- [ ] API, web, database, and MailHog are healthy.
- [ ] Seed data exists or a fresh test user can be created.
- [ ] No real production email provider credentials are required for the local run.

## Browser And Auth

- [ ] Login/register still work in the browser.
- [ ] Authenticated dashboard requests include credentials and reach the API successfully through direct `NEXT_PUBLIC_API_BASE_URL` calls, not through a general Next.js task/tag/board proxy.
- [ ] `/auth/session-bridge` only mints the API cookie for an authenticated web user and redirects only to sanitized same-site paths.
- [ ] Logout clears both web and API-authenticated state.
- [ ] Dev auth bypass is disabled unless explicitly testing a non-production bypass scenario.

## Security Headers And Errors

- [ ] API responses include expected security headers from Helmet.
- [ ] Error responses do not expose stack traces, env values, tokens, SMTP credentials, OAuth secrets, or job secrets.
- [ ] Swagger UI at `/api/taskforge/docs` loads in local development.
- [ ] Missing auth returns the expected `401` envelope on protected API routes.

## CORS, Cookies, And Proxy

- [ ] Local web origin can call the API with credentials.
- [ ] Deployed web origin can authenticate in a real browser and authenticated API requests include cookies, pass preflight, and return JSON rather than a browser CORS failure.
- [ ] An unlisted origin is rejected by CORS in a browser or equivalent controlled check.
- [ ] Cookie domain behavior matches README and production docs for the chosen topology, including `COOKIE_DOMAIN`, `SameSite=Lax`, `Secure`, `httpOnly`, and the seven-day API session cookie lifetime.
- [ ] Production browser auth uses same-site custom domains or an API behind the web origin; raw unrelated Vercel/Render/Railway default domains are not used for the OAuth session bridge cookie path.
- [ ] `/auth/session-bridge` remains `no-store`, sanitizes redirects, requires an authenticated web user, probes existing cookies, and sets the API cookie for the selected topology.
- [ ] Trusted proxy settings match the deployment target and are not set broader than necessary; `TRUST_PROXY=1` is used only for exactly one trusted scrubbing proxy hop.

## Rate Limits And Job Secrets

- [ ] Auth endpoints return bounded `429` behavior under the documented safe smoke.
- [ ] Oversized JSON bodies and overlong task/tag/filter payloads return explicit JSON errors rather than hanging or silently truncating data.
- [ ] Manual digest send rate limiting still protects the authenticated user path.
- [ ] Rate-limit documentation matches the API deployment topology: single in-process limiter state or a shared store before horizontal scaling.
- [ ] Protected digest job endpoint rejects missing and incorrect `DIGEST_JOB_SECRET`.
- [ ] Web cron proxy rejects missing and incorrect `CRON_SECRET`.
- [ ] Scheduled digest dry runs omit `digestDate` and derive user-local digest dates.

## Docker And CI

- [ ] `docker compose -f infra/docker-compose.yml config --quiet` passes.
- [ ] API and web Docker images build locally (`docker build -f apps/api/Dockerfile -t taskforge-api:local .` and `docker build -f apps/web/Dockerfile -t taskforge-web:local .`) or CI build logs show successful image builds.
- [ ] Docker startup docs still match the actual ports and service names.

## Docs And Release Gate

- [ ] README env table matches `infra/env/*.example`.
- [ ] PRD Day 6 status matches actual Milestone 6 evidence, including any pending Docker image-build gate.
- [ ] ADRs cover any final deployment or security decisions.
- [ ] Milestone 5 production email gates remain explicit and unresolved values are not presented as complete.
- [ ] Remaining Day 7 deployment tasks are clear before provisioning begins, including placeholder values for `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_SECRET`, `SESSION_BRIDGE_SECRET`, `DIGEST_JOB_SECRET`, `CRON_SECRET`, `COOKIE_DOMAIN`, and `TF_DEV_BYPASS_AUTH`.
- [ ] Production email scheduled sends remain disabled until the production fact register is complete and manual-only Resend/observability checks pass.
