# Milestone 7 Manual Checklist

Use this checklist for production v1 launch. Mark each skipped item with owner, reason, and follow-up before sign-off.

## Pre-Deployment Facts

- [ ] Production web provider/project selected.
- [ ] Production API provider/project selected.
- [ ] Managed Postgres provider/project selected.
- [ ] Production domains/subdomains selected.
- [ ] Browser-auth topology selected: same host/API behind web origin, or same-site custom subdomains with intentional `COOKIE_DOMAIN`.
- [ ] OAuth apps created for enabled providers and callback URLs match `NEXTAUTH_URL`.
- [ ] All required production secrets are stored in provider secret managers only.
- [ ] `TF_DEV_BYPASS_AUTH=false` in every production environment.
- [ ] Rate-limit topology is approved: one API instance for v1 or shared limiter store before horizontal scaling.

## Deployment

- [ ] API deploys from the intended branch SHA.
- [ ] Web deploys from the intended branch SHA.
- [ ] `prisma migrate deploy` completed against production database.
- [ ] Production seed/demo-data decision is recorded.
- [ ] API health endpoint returns `200` over HTTPS.
- [ ] Web login page returns `200` over HTTPS.
- [ ] Swagger UI loads over HTTPS.

## Authentication, CORS, And Cookies

- [ ] Credential register/login works in deployed browser.
- [ ] Enabled OAuth provider login works in deployed browser.
- [ ] Authenticated dashboard loads without CORS console errors.
- [ ] API requests include intended cookie or bearer token.
- [ ] `tf_session` is `HttpOnly`, `SameSite=Lax`, `Secure`, and scoped to the selected host/domain topology.
- [ ] `/auth/session-bridge?from=/dashboard` redirects signed-out users to login and does not mint an API cookie.
- [ ] `/auth/session-bridge` sanitizes unsafe `from` values.
- [ ] `/auth/session-bridge` redirects authenticated users to same-site paths and mints/probes API cookies as expected.
- [ ] `/api/auth/logout` clears web and API session state.
- [ ] Cross-origin logout attempt returns `403`.
- [ ] Unlisted-origin API request or preflight is rejected.

## API Auth Barrier

- [ ] Missing auth on `/api/taskforge/v1/auth/logout` returns `401`.
- [ ] Missing auth on `/api/taskforge/v1/auth/me` returns `401`.
- [ ] Missing or wrong `x-session-bridge-secret` on `/api/taskforge/v1/auth/session-bridge` returns `401`.
- [ ] Missing or wrong `x-session-bridge-secret` on `/api/taskforge/v1/auth/welcome-email` returns `401`.
- [ ] Missing auth on `/api/taskforge/v1/me` returns `401`.
- [ ] Missing auth on `/api/taskforge/v1/me/email-preferences` returns `401`.
- [ ] Missing auth on `GET /api/taskforge/v1/tasks` returns `401`.
- [ ] Missing auth on `POST /api/taskforge/v1/tasks` returns `401`.
- [ ] Missing auth on `GET /api/taskforge/v1/tasks/:id` returns `401`.
- [ ] Missing auth on `PATCH /api/taskforge/v1/tasks/:id` returns `401`.
- [ ] Missing auth on `DELETE /api/taskforge/v1/tasks/:id` returns `401`.
- [ ] Missing auth on `/api/taskforge/v1/tasks/board` returns `401`.
- [ ] Missing auth on `/api/taskforge/v1/tasks/board/move` returns `401`.
- [ ] Missing auth on `GET /api/taskforge/v1/tags` returns `401`.
- [ ] Missing auth on `POST /api/taskforge/v1/tags` returns `401`.
- [ ] Missing auth on `/api/taskforge/v1/email/digest/preview` returns `401`.
- [ ] Missing auth on `/api/taskforge/v1/email/digest/send` returns `401`.
- [ ] Missing or wrong `DIGEST_JOB_SECRET` on `GET /api/taskforge/v1/jobs/digest` returns `401`.
- [ ] Missing or wrong `DIGEST_JOB_SECRET` on `POST /api/taskforge/v1/jobs/digest` returns `401`.
- [ ] Missing or wrong `CRON_SECRET` on web cron proxy returns `401`.
- [ ] Public routes are still intentionally public: health, Swagger docs, register, login, refresh, and NextAuth handlers.

## Product Workflows

- [ ] Create a task.
- [ ] Edit a task title, description, due date, status, priority, and tags.
- [ ] Clear optional task fields.
- [ ] Delete a task.
- [ ] Search/filter by text, status, priority, tag, and due range.
- [ ] Move a task across board columns.
- [ ] Reorder a task in board-order mode.
- [ ] Create a tag from the selector.
- [ ] Update digest preferences.
- [ ] Preview digest payload.
- [ ] Run manual digest dry run only; real send requires the email enablement section.

## Responsiveness And Devices

- [ ] `/login` works at 375x667, 390x844, 768x1024, 1024x768, 1366x768, and wide desktop.
- [ ] `/register` works at the same viewport set.
- [ ] `/dashboard` works at the same viewport set.
- [ ] Task dialogs fit the viewport and primary actions are reachable.
- [ ] Tag selector and due-date picker fit the viewport.
- [ ] Toasts do not cover required actions on mobile.
- [ ] Board lanes/cards remain usable on mobile and tablet.
- [ ] No page-level horizontal scroll appears unless intentionally documented.
- [ ] Real mobile or tablet touch smoke passes for auth, task form, filters, and board interaction.

## Production Email Enablement

- [ ] Resend domain is verified.
- [ ] `EMAIL_FROM` uses the verified production domain.
- [ ] Resend API key is stored only in API secret manager.
- [ ] Web has no SMTP or Resend API key.
- [ ] `EMAIL_DAILY_SEND_LIMIT` is 90 or lower while on Resend free.
- [ ] `docs/prod/email-production-rollout.md` fact register has no `<TBD before enablement>` values if real sends are enabled.
- [ ] Protected digest job dry run passes.
- [ ] One manual-only real send to an approved internal recipient passes.
- [ ] Delivery record, API logs, Resend logs, quota state, and alert/escalation path are reviewed.
- [ ] Exactly one unattended scheduler path is enabled, or scheduled sends are explicitly deferred.

## Sign-Off

- [ ] Latest automated checks or CI run passed for the final branch SHA.
- [ ] Production facts and known limitations are documented without secrets.
- [ ] PR summary/release notes include exact verification dates.
- [ ] Post-launch tasks are created for accepted limitations.
- [ ] v1 release owner approves launch.
