# Production Email Rollout

Use this document as the production fact register for enabling real TaskForge email sends. Keep scheduled real sends disabled until every `<TBD before enablement>` value below has been replaced with the actual production value or location.

## Current rollout state

- Status: pre-launch TODO.
- Real scheduled sends: disabled.
- HTTP pack production-like real sends: disabled/commented by default.
- Default provider: Resend SMTP through the provider-neutral Nodemailer adapter.
- Resend quota source checked on 2026-05-26: free transactional email lists 100 emails/day and 3,000 emails/month. Sent and received messages count toward quota, and multiple recipients count separately.
- TaskForge application budget while on Resend free: `EMAIL_DAILY_SEND_LIMIT=90`.

Official quota references:
- https://resend.com/docs/knowledge-base/resend-sending-limits
- https://resend.com/docs/api-reference/rate-limit
- https://resend.com/pricing

## Production fact register

| Item | Current value |
| --- | --- |
| Resend account owner/team | `<TBD before enablement>` |
| Production sending domain | `<TBD before enablement>` |
| Domain verification state | `<TBD before enablement>` |
| DNS records required | SPF + DKIM from Resend, plus DMARC before launch |
| `EMAIL_FROM` | `<TBD before enablement>` |
| Resend plan | Free until explicitly changed |
| API `CORS_ALLOWED_ORIGINS` | `<TBD before enablement>`; exact deployed web origin list |
| API `SMTP_PASS` storage | `<TBD before enablement>`; API secret manager only |
| API `DIGEST_JOB_SECRET` storage | `<TBD before enablement>` |
| Web `CRON_SECRET` storage | `<TBD before enablement>` |
| Web `DIGEST_JOB_SECRET` storage | `<TBD before enablement>`; must match API |
| CI fallback secrets | `<TBD before enablement>`; only if GitHub Actions scheduler fallback is enabled |
| Production digest schedule | `<TBD before enablement>` UTC hour and expected local audience window |
| Daily send budget | `90` while on Resend free |
| First-rollout reviewer | `<TBD before enablement>` |
| Escalation path for delivery failures | `<TBD before enablement>` monitored channel/person |

Do not store the Resend API key in the web app, browser-visible env vars, repository secrets used by unrelated workflows, screenshots, PR comments, or this file.

## Pre-launch gates

1. Complete the Resend setup checklist in `docs/prod/resend-email-setup.md`.
2. Replace every `<TBD before enablement>` value in the fact register.
3. Deploy API env from `infra/env/api.prod.env.example`.
4. Deploy web env from `infra/env/web.prod.env.example`.
5. Confirm API `CORS_ALLOWED_ORIGINS` contains the deployed web origin used by browsers.
6. Confirm the web app has no `SMTP_PASS` or Resend API key.
7. Run a production dry run through the protected digest job endpoint.
8. Run a manual-only real send to an approved internal recipient.
9. Confirm TaskForge delivery records, API logs, Resend logs, alert delivery, and quota state.
10. Enable exactly one scheduler path: Vercel Cron preferred, GitHub Actions fallback only if selected.
11. Keep first scheduled sends under daily human review.

## Manual production smoke

Use this only after the fact register is complete.

1. Confirm `EMAIL_FROM` uses the verified production domain.
2. Confirm `EMAIL_DAILY_SEND_LIMIT=90` or lower while on Resend free.
3. Confirm `apps/api/tests/email.http` still has the production-like Resend request commented unless the operator is intentionally running a one-off smoke.
4. Run the protected digest endpoint with `dryRun=true`.
5. For one approved internal recipient, run a manual send with `dryRun=false`.
6. Verify one provider send in Resend logs and one `SENT` delivery attempt in TaskForge.
7. Re-run the same user/date and confirm idempotency prevents a duplicate send.

## Post-production TODOs

- Review the daily human review requirement after the first rollout window.
- Re-check Resend quota and pricing before increasing `EMAIL_DAILY_SEND_LIMIT`.
- Update `docs/prod/resend-email-setup.md`, `docs/prod/digest-scheduler.md`, and this file if the account moves from free to paid.
- Decide whether delivery history needs an admin dashboard, export, or alert-only workflow.
- Revisit shared rate-limit storage if the API runs multiple instances.
