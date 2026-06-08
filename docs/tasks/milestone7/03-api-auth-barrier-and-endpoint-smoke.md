# Task: API authentication barrier audit and endpoint smoke

## Summary
- Confirm every API and web server route has the intended public, authenticated, same-origin, or secret-protected barrier before v1 launch.
- Produce a route matrix and deployed negative-smoke evidence so no user-data endpoint is accidentally public.

**Status:** Planned.

## Acceptance Criteria
- [ ] Route matrix lists every Express API route, every Next.js route handler, expected barrier type, allowed public status, and negative-smoke command.
- [ ] Public routes are limited and justified: API health, Swagger docs, credential register/login/refresh, and NextAuth public auth handlers as designed.
- [ ] User-data API routes require `authMiddleware`: `/me`, `/me/email-preferences`, `/tasks`, `/tasks/:id`, `/tasks/board`, `/tasks/board/move`, `/tags`, `/email/digest/preview`, and `/email/digest/send`.
- [ ] Server-to-server routes require configured secrets: API `/auth/session-bridge`, API `/auth/welcome-email`, API `/jobs/digest`, and web `/api/cron/digest`.
- [ ] Web `/api/auth/logout` remains same-origin protected and expires the API session cookie.
- [ ] Negative smokes prove missing/incorrect auth returns `401` or `403` for every protected/secret/same-origin route in local and deployed environments.
- [ ] `DIGEST_JOB_SECRET` and `CRON_SECRET` missing/misconfigured states are documented as deployment blockers, not silently skipped production behavior.

## Current Audit Inputs
- `apps/api/src/app.ts` mounts tasks, tags, `/me`, email preferences, and email digest routes behind `authRouterFactory.authMiddleware`.
- `apps/api/src/routes/jobs.ts` protects digest jobs with `x-job-secret` or `Authorization: Bearer <secret>` and throttles unauthorized attempts.
- `apps/api/src/routes/auth.ts` leaves register/login/refresh public by design, protects logout with auth middleware, and protects session bridge/welcome email with `x-session-bridge-secret` when configured.
- `apps/web/app/api/cron/digest/route.ts` requires `CRON_SECRET` and forwards to the API job route with `DIGEST_JOB_SECRET`.
- `apps/web/app/api/auth/logout/route.ts` requires same-origin `Origin` or `Referer`.

## Route Matrix Seed
| Surface | Route | Expected barrier |
| --- | --- | --- |
| API | `GET /api/taskforge/v1/health` | Public health check |
| API | `GET /api/taskforge/docs` | Public documentation |
| API | `POST /api/taskforge/v1/auth/register` | Public credential entry, rate limited |
| API | `POST /api/taskforge/v1/auth/login` | Public credential entry, rate limited |
| API | `POST /api/taskforge/v1/auth/refresh` | Public refresh-token exchange, rate limited |
| API | `POST /api/taskforge/v1/auth/logout` | Authenticated user via bearer or `tf_session` |
| API | `GET /api/taskforge/v1/auth/me` | Authenticated user via bearer or `tf_session` |
| API | `POST /api/taskforge/v1/auth/session-bridge` | `x-session-bridge-secret` |
| API | `POST /api/taskforge/v1/auth/welcome-email` | `x-session-bridge-secret` |
| API | `GET /api/taskforge/v1/me` | Authenticated user via bearer or `tf_session` |
| API | `PATCH /api/taskforge/v1/me/email-preferences` | Authenticated user via bearer or `tf_session` |
| API | `GET /api/taskforge/v1/tasks` | Authenticated user via bearer or `tf_session` |
| API | `POST /api/taskforge/v1/tasks` | Authenticated user via bearer or `tf_session` |
| API | `GET /api/taskforge/v1/tasks/:id` | Authenticated owner via bearer or `tf_session` |
| API | `PATCH /api/taskforge/v1/tasks/:id` | Authenticated owner via bearer or `tf_session` |
| API | `DELETE /api/taskforge/v1/tasks/:id` | Authenticated owner via bearer or `tf_session` |
| API | `GET /api/taskforge/v1/tasks/board` | Authenticated user via bearer or `tf_session` |
| API | `PATCH /api/taskforge/v1/tasks/board/move` | Authenticated user via bearer or `tf_session` |
| API | `GET /api/taskforge/v1/tags` | Authenticated user via bearer or `tf_session` |
| API | `POST /api/taskforge/v1/tags` | Authenticated user via bearer or `tf_session` |
| API | `GET /api/taskforge/v1/email/digest/preview` | Authenticated user via bearer or `tf_session` |
| API | `POST /api/taskforge/v1/email/digest/send` | Authenticated user via bearer or `tf_session` plus user rate limit |
| API | `GET /api/taskforge/v1/jobs/digest` | `DIGEST_JOB_SECRET` via bearer or `x-job-secret` |
| API | `POST /api/taskforge/v1/jobs/digest` | `DIGEST_JOB_SECRET` via bearer or `x-job-secret` |
| Web | `GET/POST /api/auth/[...nextauth]` | NextAuth handler and provider callback rules |
| Web | `GET /api/auth/me` | Returns active server-side auth context or null; no private data without session |
| Web | `POST /api/auth/logout` | Same-origin request, clears web/API cookies |
| Web | `GET /auth/session-bridge` | Authenticated web user, sanitized same-site redirect, no-store |
| Web | `GET /api/cron/digest` | `CRON_SECRET` bearer token |

## Manual Step Timing
| Step | Timing | Owner | Notes |
| --- | --- | --- | --- |
| Static route inventory | Before deployment | Agent | Can be done from source and OpenAPI. |
| Local negative HTTP smoke | Before deployment | Agent | Use placeholders only; do not use production secrets. |
| Deployed negative smoke | After deployment | Agent or human | Requires deployed API/web URLs and approved test environment. |
| Production shared-secret confirmation | Before v1 sign-off | Human | Confirm secret manager values exist without revealing them. |

## Verification
- Extend or run `apps/api/tests/security.http` for local negative coverage.
- Run `pnpm -C apps/api run lint:http`.
- Run focused API/web tests for auth, session bridge, jobs, cron, and email preference routes.
- Compare OpenAPI `security` entries to runtime route barriers.
- Record deployed negative-smoke results in `docs/testing/milestone7-manual-checklist.md`.
