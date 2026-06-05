# Milestone 6 Manual Checklist

Use this checklist after the automated checks in `docs/testing/milestone6-automated.md` and after the safe HTTP examples in `apps/api/tests/security.http` pass against the environment under review.

## Local Preconditions

- [ ] `make up` or the documented local stack is running.
- [ ] API, web, database, and MailHog are healthy.
- [ ] Seed data exists or a fresh test user can be created.
- [ ] No real production email provider credentials are required for the local run.
- [ ] HTTP smoke files use placeholders only; do not paste production tokens, real job secrets, real cron secrets, or production email recipients into committed files.

## Browser And Auth

- [ ] Login/register still work in the browser.
- [ ] Authenticated dashboard requests include credentials and reach the API successfully through direct `NEXT_PUBLIC_API_BASE_URL` calls, not through a general Next.js task/tag/board proxy.
- [ ] `/auth/session-bridge` only mints the API cookie for an authenticated web user and redirects only to sanitized same-site paths.
- [ ] Logout clears both web and API-authenticated state.
- [ ] Dev auth bypass is disabled unless explicitly testing a non-production bypass scenario.

### `/auth/session-bridge` Browser Smoke

Run this section only when both apps are available locally or in a preview environment and the web app points at the matching API.

- [ ] Signed-out requirement: in a private browser window, open `/auth/session-bridge?from=/dashboard`; expect a redirect to `/login?from=/dashboard&reason=session-bridge` and no `tf_session` cookie minted.
- [ ] Redirect sanitization: while signed out, open `/auth/session-bridge?from=%2F%2Fevil.example%2Fdashboard`; expect the `from` value to be sanitized to `/` rather than a protocol-relative external URL.
- [ ] Authenticated minting: sign in, clear only the API `tf_session` cookie if present, then open `/auth/session-bridge?from=/dashboard`; expect a same-origin redirect to `/dashboard` and a new `tf_session` cookie scoped according to the environment's cookie-domain policy.
- [ ] Existing-cookie path: repeat `/auth/session-bridge?from=/dashboard` with a valid, unexpired `tf_session`; expect a same-origin redirect without an unnecessary extra API-cookie minting loop.
- [ ] No-cache headers: inspect the `/auth/session-bridge` network entry and confirm `Cache-Control: no-store` on redirect responses.

### Logout Same-Origin And Cookie Expiry Smoke

Run this section only when the web route can be exercised in the target environment.

- [ ] Same-origin protection: submit `POST /api/auth/logout` from the web origin; expect `200` JSON and expired `tf_session` `Set-Cookie` headers.
- [ ] Cross-origin rejection: send the same POST with an unrelated `Origin` header from a controlled local tool; expect `403` and do not repeat against shared production.
- [ ] Cookie expiry: after successful logout, verify browser storage no longer has a usable web session or API `tf_session`, then refresh `/dashboard` and expect redirect to login/session bridge instead of authenticated data.

## Security Headers And Errors

- [ ] API responses include expected security headers from Helmet.
- [ ] Error responses do not expose stack traces, env values, tokens, SMTP credentials, OAuth secrets, or job secrets.
- [ ] Swagger UI at `/api/taskforge/docs` loads in local development.
- [ ] Missing auth returns the expected `401` envelope on protected API routes.
- [ ] `apps/api/tests/security.http` missing/incorrect credential examples return expected `401` responses for auth, tasks, board, tags, email, job, and cron-proxy paths.

## CORS, Cookies, And Proxy

`.http` clients and plain `curl` can display response headers, but they do not enforce browser CORS policy, preflight caching, blocked credential rules, or cookie jar behavior the same way a real browser does. Use a browser for final approval.

- [ ] Local web origin can call the API with credentials.
- [ ] Deployed web origin can authenticate in a real browser and authenticated API requests include cookies, pass preflight, and return JSON rather than a browser CORS failure.
- [ ] Browser preflight: from the allowed web origin, trigger an authenticated API request with `Content-Type: application/json` or `Authorization`; confirm the `OPTIONS` preflight succeeds and includes the expected `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, `Access-Control-Allow-Headers`, and method headers.
- [ ] Credentialed cookie request: in browser DevTools, confirm task/tag/board API requests send the intended cookie or bearer token and the API response is visible to JavaScript; a network `200` hidden behind a CORS console error does not count as success.
- [ ] Unlisted-origin rejection: from a controlled test origin that is not in `CORS_ALLOWED_ORIGINS`, attempt a credentialed API request and confirm the browser blocks it or the server returns the expected CORS error. Do not use arbitrary third-party pages for this check.
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

### Safe Bounded Rate-Limit Smoke

Use this only against local Docker, a personal preview, or an explicitly approved test environment. Do not run it against shared production, do not parallelize it, and stop immediately after the first expected `429`.

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  status=$(curl -sS -o /tmp/taskforge-rate-limit-smoke.json -w "%{http_code}" \
    -X POST http://localhost:4000/api/taskforge/v1/auth/login \
    -H 'Content-Type: application/json' \
    --data '{"email":"rate-limit-smoke@example.invalid","password":"WrongPassword1!"}')
  printf 'attempt=%s status=%s\n' "$i" "$status"
  if [ "$status" = "429" ]; then
    break
  fi
  sleep 1
done
```

Expected result: one of the bounded attempts returns `429` with the standard JSON rate-limit envelope and rate-limit headers. If no `429` appears after ten sequential attempts, stop anyway and inspect the environment's limiter configuration rather than increasing the loop count.

### Job And Cron Secret Negative Smoke

Use placeholder values only. The HTTP equivalents are in `apps/api/tests/security.http`.

```bash
curl -i 'http://localhost:4000/api/taskforge/v1/jobs/digest?dryRun=true&sendLimit=0'
curl -i 'http://localhost:4000/api/taskforge/v1/jobs/digest?dryRun=true&sendLimit=0' \
  -H 'Authorization: Bearer replace-with-wrong-digest-job-secret'
curl -i -X POST 'http://localhost:4000/api/taskforge/v1/jobs/digest' \
  -H 'Content-Type: application/json' \
  -H 'x-job-secret: replace-with-wrong-digest-job-secret' \
  --data '{"dryRun":true,"sendLimit":0}'
curl -i 'http://localhost:3000/api/cron/digest?dryRun=true&sendLimit=0'
curl -i 'http://localhost:3000/api/cron/digest?dryRun=true&sendLimit=0' \
  -H 'Authorization: Bearer replace-with-wrong-cron-secret'
```

Expected result: every request above returns `401 Unauthorized` when the local API/web routes are configured with non-empty `DIGEST_JOB_SECRET` and `CRON_SECRET`. The cron proxy checks require the web app route to be running; if only the API is running, mark the cron checks as not applicable for that run and complete them in a web-capable environment.

## Docker And CI

- [ ] `docker compose -f infra/docker-compose.yml config --quiet` passes.
- [ ] API and web Docker images build locally (`docker build -f apps/api/Dockerfile -t taskforge-api:local .` and `docker build -f apps/web/Dockerfile -t taskforge-web:local .`) or CI build logs show successful image builds.
- [ ] Any Alpine optional native binding failures in Docker logs are confirmed non-fatal; the build exits `0` and exports/names the requested image.
- [ ] Docker startup docs still match the actual ports and service names.

## Docs And Release Gate

- [ ] README env table matches `infra/env/*.example`.
- [ ] PRD Day 6 status matches actual Milestone 6 evidence, including any pending Docker image-build gate.
- [ ] ADRs cover any final deployment or security decisions.
- [ ] Milestone 5 production email gates remain explicit and unresolved values are not presented as complete.
- [ ] Remaining Day 7 deployment tasks are clear before provisioning begins, including placeholder values for `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_SECRET`, `SESSION_BRIDGE_SECRET`, `DIGEST_JOB_SECRET`, `CRON_SECRET`, `COOKIE_DOMAIN`, and `TF_DEV_BYPASS_AUTH`.
- [ ] Production email scheduled sends remain disabled until the production fact register is complete and manual-only Resend/observability checks pass.
