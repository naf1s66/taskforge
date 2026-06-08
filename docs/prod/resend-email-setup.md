# Production Email Setup (Resend SMTP)

TaskForge uses Resend SMTP as the default production mail relay.

Real outbound email should remain disabled until a future pre-launch issue completes the manual account, DNS, sender, and secret setup below.

## Required API environment variables

- `SMTP_HOST=smtp.resend.com`
- `SMTP_PORT=2587`
- `SMTP_USER=resend`
- `SMTP_PASS=<RESEND_API_KEY>`
- `EMAIL_FROM=<VERIFIED_SENDER_ON_RESEND_DOMAIN>`
- `EMAIL_DAILY_SEND_LIMIT=90`
- `DIGEST_JOB_SECRET=<random job invocation secret>`
- `CORS_ALLOWED_ORIGINS=<deployed web origin>`

The production API env example lives at `infra/env/api.prod.env.example`.

The web app must not receive Resend SMTP credentials. Web production only needs `CRON_SECRET` and the same `DIGEST_JOB_SECRET` used by the API when the Vercel Cron proxy is enabled; see `infra/env/web.prod.env.example`.

Resend's free transactional plan is documented as 100 emails/day and 3,000 emails/month as of 2026-06-08. TaskForge keeps `EMAIL_DAILY_SEND_LIMIT=90` by default to leave a quota buffer for welcome emails, received mail counting, retries, and provider-side recipient counting.

## Free-hosting SMTP path

Provider docs checked on 2026-06-08:
- Render free web services block outbound SMTP traffic on ports `25`, `465`, and `587`.
- Resend supports SMTP on `25`, `465`, `587`, `2465`, and `2587`; `2587` is a STARTTLS port.
- Resend free accounts have immediate production access after account signup, domain verification, and API key creation.
- Other no-cost SMTP candidates checked for fallback planning: Brevo documents a free plan with 300 daily sends and SMTP port `2525`; Mailjet documents a free plan with 200 daily sends and SMTP port `2525`; Mailtrap documents a free Email API/SMTP plan with 150 daily sends and supports SMTP port `2525`; MailerSend documents a free plan with SMTP relay but currently recommends port `587`, which does not solve the Render-free port block; Twilio SendGrid documents port `2525`, but new free sending access is currently a 60-day trial rather than a durable free v1 path.

TaskForge therefore selects `SMTP_PORT=2587` for the Render-free v1 API. Task 04 must prove this from the deployed API host before production smoke. If `2587` is blocked or unreliable from the selected host, do not enable real sends; document a no-cost fallback before v1 launch. The preferred fallback is a Resend HTTP API adapter because it avoids SMTP egress entirely while keeping the selected Resend account/domain/quota model. The preferred SMTP-provider fallback is Mailtrap Email API/SMTP on port `2525`, followed by Brevo or Mailjet on `2525`; all provider fallbacks require separate sender/domain setup and should be recorded as a provider change before use.

Official references:
- Render free instance limitations: https://render.com/docs/free
- Render SMTP-port block changelog: https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
- Resend SMTP ports: https://resend.com/docs/send-with-smtp
- Resend account quotas: https://resend.com/docs/knowledge-base/account-quotas-and-limits
- Resend production access: https://resend.com/docs/knowledge-base/does-resend-require-production-approval
- Brevo free plan and SMTP docs: https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans and https://developers.brevo.com/docs/smtp-integration
- Mailjet free plan and SMTP docs: https://documentation.mailjet.com/hc/en-us/articles/360043048393-What-is-this-200-emails-per-day-limit-on-free-accounts and https://dev.mailjet.com/smtp-relay/configuration/
- Mailtrap free plan and SMTP docs: https://mailtrap.io/pricing/ and https://docs.mailtrap.io/email-api-smtp/help/glossary
- MailerSend free plan and SMTP docs: https://www.mailersend.com/help/plans-features-and-limits and https://www.mailersend.com/help/smtp-relay
- Twilio SendGrid trial and SMTP docs: https://help.twilio.com/articles/47846436523419 and https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api

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
10. During Task 04, confirm the deployed API can start with `SMTP_PORT=2587` and can reach the Resend SMTP endpoint without exposing credentials in logs.
11. Configure the free digest scheduler from ADR 0006 and `docs/prod/digest-scheduler.md`: prefer Vercel Cron calling the web proxy route, with GitHub Actions schedule as the fallback.
12. Configure automated alerts for Resend delivery failures, provider quota exhaustion, and provider rate-limit exhaustion.
13. Assign a daily human reviewer for the first production rollout.
14. Confirm the reviewer can access TaskForge logs, delivery history, Resend logs, alert delivery, and quota state.
15. Run production-like dry runs and manual-only sends against the verified sender before enabling scheduled sends.
16. If `apps/api/tests/email.http` is used for a production-like smoke, keep the Resend request commented until the verified domain, deployed secrets, target recipient, and `dryRun=false` intent are confirmed in the local operator environment.

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
