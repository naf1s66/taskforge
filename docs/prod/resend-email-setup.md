# Production Email Setup (Resend SMTP)

TaskForge uses Resend SMTP as the default production mail relay.

Real outbound email should remain disabled until a future pre-launch issue completes the manual account, DNS, sender, and secret setup below.

## Required environment variables

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_USER=resend`
- `SMTP_PASS=<RESEND_API_KEY>`
- `EMAIL_FROM=<verified sender>`
- `EMAIL_DAILY_SEND_LIMIT=90`
- `DIGEST_JOB_SECRET=<random job invocation secret>`

The production API env example lives at `infra/env/api.prod.env.example`.

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
9. Configure the free digest scheduler from ADR 0006 and `docs/prod/digest-scheduler.md`: prefer Vercel Cron calling the web proxy route, with GitHub Actions schedule as the fallback.
10. Configure automated alerts for Resend delivery failures, provider quota exhaustion, and provider rate-limit exhaustion.
11. Assign a daily human reviewer for the first production rollout.
12. Confirm the reviewer can access TaskForge logs, delivery history, Resend logs, alert delivery, and quota state.
13. Run production-like dry runs and manual-only sends against the verified sender before enabling scheduled sends.
14. If `apps/api/tests/email.http` is used for a production-like smoke, keep the Resend request commented until the verified domain, deployed secrets, target recipient, and `dryRun=false` intent are confirmed in the local operator environment.

The email rollout decisions are documented in `docs/prod/adr/0007-email-observability-rollout-decisions.md`.

## Deployment secret placement (document per target)

Document where `SMTP_PASS` (Resend API key) is stored for each deployment target without committing the secret value.

- API host (Render/Railway/etc): `<document secret manager location>`
- Web host (if needed for proxy/job secret coordination): `<document secret manager location>`
- CI or scheduler fallback (GitHub Actions): `<document secret manager location>`

Update these placeholders once the production stack is finalized.

## Free-plan operational guardrails

- Keep `EMAIL_DAILY_SEND_LIMIT=90` unless the Resend plan changes.
- Record the production digest schedule (UTC hour), expected daily send budget, and escalation path for delivery failures before enabling unattended schedules.
- If the Resend account is upgraded from free to paid, re-evaluate and update:
  - `EMAIL_DAILY_SEND_LIMIT`
  - scheduler cadence/concurrency assumptions
  - rollback and escalation instructions in runbooks.

> Do not commit SMTP secrets to the repository.
