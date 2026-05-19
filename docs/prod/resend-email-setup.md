# Production Email Setup (Resend SMTP)

TaskForge uses Resend SMTP as the default production mail relay.

Real outbound email should remain disabled until a future pre-launch issue completes the manual account, DNS, sender, and secret setup below.

## Required environment variables

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=587`
- `SMTP_USER=resend`
- `SMTP_PASS=<RESEND_API_KEY>`
- `EMAIL_FROM=<verified sender>`
- `EMAIL_DAILY_SEND_LIMIT=100`
- `DIGEST_JOB_SECRET=<random job invocation secret>`

The production API env example lives at `infra/env/api.prod.env.example`.

## Pre-launch manual checklist

1. Create/select the Resend account for TaskForge production email ownership.
2. Add a sending domain/subdomain (recommended: `mail.<your-domain>`).
3. Complete SPF + DKIM verification in Resend.
4. Add DMARC before enabling production sends.
5. Create a Resend SMTP API key and set it as `SMTP_PASS`.
6. Choose `EMAIL_FROM` using the verified domain (example: `TaskForge <noreply@mail.taskforge.example>`).
7. Set `EMAIL_DAILY_SEND_LIMIT` at or below the active Resend daily limit. Keep it at `100` or lower on the free plan unless the account is upgraded.
8. Set `DIGEST_JOB_SECRET` to a strong random value before enabling the protected digest job endpoint.
9. Configure the free digest scheduler from ADR 0006: prefer Vercel Cron calling the protected endpoint, with GitHub Actions schedule as the fallback.
10. Run a production-like dry run against the verified sender and digest date window before enabling scheduled or user-triggered real sends.

> Do not commit SMTP secrets to the repository.
