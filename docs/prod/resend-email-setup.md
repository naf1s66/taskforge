# Production Email Setup (Resend SMTP)

TaskForge uses Resend SMTP as the default production mail relay.

Real outbound email should remain disabled until a future pre-launch issue completes the manual account, DNS, sender, and secret setup below.

## Required API environment variables

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_USER=resend`
- `SMTP_PASS=<RESEND_API_KEY>`
- `EMAIL_FROM=<VERIFIED_SENDER_ON_RESEND_DOMAIN>`
- `EMAIL_DAILY_SEND_LIMIT=90`
- `DIGEST_JOB_SECRET=<random job invocation secret>`
- `CORS_ALLOWED_ORIGINS=<deployed web origin>`

The production API env example lives at `infra/env/api.prod.env.example`.

The web app must not receive Resend SMTP credentials. Web production only needs `CRON_SECRET` and the same `DIGEST_JOB_SECRET` used by the API when the Vercel Cron proxy is enabled; see `infra/env/web.prod.env.example`.

Resend's free transactional plan is documented as 100 emails/day and 3,000 emails/month as of 2026-05-26. TaskForge keeps `EMAIL_DAILY_SEND_LIMIT=90` by default to leave a quota buffer for welcome emails, received mail counting, retries, and provider-side recipient counting.

## Pre-launch manual checklist

1. Create/select the Resend account for TaskForge production email ownership.
2. Add a sending domain/subdomain (recommended: `mail.<your-domain>`).
   - Record the exact chosen production domain in this file before enabling real sends.
3. Complete SPF + DKIM verification in Resend.
4. Add DMARC before enabling production sends.
5. Create a Resend SMTP API key and set it as `SMTP_PASS`.
6. Choose `EMAIL_FROM` using the verified domain (example: `TaskForge <noreply@mail.taskforge.example>`).
7. Set `EMAIL_DAILY_SEND_LIMIT` at or below the active Resend daily limit. Use `90` on the free plan by default to leave room for other transactional mail and provider-side counting differences.
8. Set `DIGEST_JOB_SECRET` to a strong random value before enabling the protected digest job endpoint.
9. Set `CORS_ALLOWED_ORIGINS` to the deployed web origin so authenticated browser calls can reach the API.
10. Configure the free digest scheduler from ADR 0006 and `docs/prod/digest-scheduler.md`: prefer Vercel Cron calling the web proxy route, with GitHub Actions schedule as the fallback.
11. Configure automated alerts for Resend delivery failures, provider quota exhaustion, and provider rate-limit exhaustion.
12. Assign a daily human reviewer for the first production rollout.
13. Confirm the reviewer can access TaskForge logs, delivery history, Resend logs, alert delivery, and quota state.
14. Run production-like dry runs and manual-only sends against the verified sender before enabling scheduled sends.
15. If `apps/api/tests/email.http` is used for a production-like smoke, keep the Resend request commented until the verified domain, deployed secrets, target recipient, and `dryRun=false` intent are confirmed in the local operator environment.

The email rollout decisions are documented in `docs/prod/adr/0007-email-observability-rollout-decisions.md`. The production fact register and post-production TODOs live in `docs/prod/email-production-rollout.md`.

## Deployment secret placement (document per target)

Document where each secret is stored for each deployment target without committing the secret value.

- API host (Render/Railway/etc):
  - `SMTP_PASS=<RESEND_API_KEY>`
  - `DIGEST_JOB_SECRET=<random job invocation secret>`
  - `EMAIL_FROM=<verified sender>`
  - `EMAIL_DAILY_SEND_LIMIT=90`
  - `CORS_ALLOWED_ORIGINS=<deployed web origin>`
- Web host (Vercel/etc):
  - `CRON_SECRET=<random Vercel Cron bearer secret>`
  - `DIGEST_JOB_SECRET=<same value as API>`
  - No `SMTP_PASS`; the web app should never hold the Resend API key.
- CI or scheduler fallback (GitHub Actions):
  - `DIGEST_JOB_SECRET=<same value as API>` when directly invoking the protected API job endpoint.
  - `API_BASE_URL=<deployed API base URL>` or equivalent workflow variable.
  - No `SMTP_PASS` unless a separate, explicitly approved production-provider smoke workflow is added later.

Update these placeholders once the production stack is finalized.

## Free-plan operational guardrails

- Keep `EMAIL_DAILY_SEND_LIMIT=90` unless the Resend plan changes.
- Record the production digest schedule (UTC hour), expected daily send budget, and escalation path for delivery failures before enabling unattended schedules.
- Re-check the current Resend quota docs before launch and whenever the account plan changes.
- If the Resend account is upgraded from free to paid, re-evaluate and update:
  - `EMAIL_DAILY_SEND_LIMIT`
  - scheduler cadence/concurrency assumptions
  - rollback and escalation instructions in runbooks.

> Do not commit SMTP secrets to the repository.
