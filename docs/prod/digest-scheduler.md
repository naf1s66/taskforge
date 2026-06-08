# Production Digest Scheduler

TaskForge sends daily digests through an explicit runner, not an always-running worker. The runner can be invoked by the API job endpoint, the local CLI, or a CI smoke check.

## Production Shape

- Preferred free scheduler: Vercel Cron calls the web proxy route `GET /api/cron/digest`.
- Web proxy: validates Vercel's `Authorization: Bearer <CRON_SECRET>` header, then forwards to the API.
- API job endpoint: `GET` or `POST /api/taskforge/v1/jobs/digest`.
- API job auth: `Authorization: Bearer <DIGEST_JOB_SECRET>` or `x-job-secret: <DIGEST_JOB_SECRET>`.
- Free fallback scheduler: GitHub Actions scheduled workflow calling the API endpoint directly.

## Required Environment

Set these values before enabling real sends. These are placeholder locations only; store real values in deployment secret managers, not in git:

- API: `infra/env/api.prod.env.example` has `DIGEST_JOB_SECRET=<RANDOM_DIGEST_JOB_SECRET>` and `EMAIL_DAILY_SEND_LIMIT=90`
- Web: `infra/env/web.prod.env.example` has `CRON_SECRET=<RANDOM_VERCEL_CRON_SECRET>` and `DIGEST_JOB_SECRET=<RANDOM_DIGEST_JOB_SECRET>`

The web and API `DIGEST_JOB_SECRET` values must match. Keep `EMAIL_DAILY_SEND_LIMIT` at `90` on the Resend free plan unless there is an intentional reason to use the full 100-message quota.

API production placeholders live in `infra/env/api.prod.env.example`; web production placeholders live in `infra/env/web.prod.env.example`.

## Request Contract

`POST /api/taskforge/v1/jobs/digest`

```json
{
  "dryRun": true,
  "sendLimit": 90,
  "digestHourUtc": 8
}
```

`GET /api/taskforge/v1/jobs/digest?dryRun=true&sendLimit=90&digestHourUtc=8`

- `digestDate`: optional `YYYY-MM-DD` calendar date. Omit it for scheduled production runs so the API derives the correct local digest date for each user's `dailyDigestTimezone`; provide it only for manual dry runs, manual sends, or intentional backfills.
- `dryRun`: optional boolean; when true, reports would-send counts without sending email or recording deliveries.
- `sendLimit`: optional non-negative integer; defaults to `EMAIL_DAILY_SEND_LIMIT`.
- `digestHourUtc`: optional integer `0` through `23`; when set, users with a different configured digest hour are skipped.

The response includes `attempted`, `sent`, `skipped`, `failed`, `budgetSkipped`, `providerQuotaSkipped`, and other skip reason counts.

## Local Verification

Run a dry run from the API package:

```bash
pnpm -C apps/api digest:run 2026-05-19 --dry-run
```

Run the protected API endpoint locally:

```bash
curl -X POST http://localhost:4000/api/taskforge/v1/jobs/digest \
  -H "content-type: application/json" \
  -H "x-job-secret: dev-digest-job-secret" \
  -d '{"dryRun":true,"sendLimit":90}'
```

Replace `dev-digest-job-secret` if the local API env overrides `DIGEST_JOB_SECRET`.

## Production Enablement

Real scheduled production sends are disabled for the release candidate. Enable them only after all gates below pass.

1. Complete `docs/prod/resend-email-setup.md`.
2. Complete the production fact register in `docs/prod/email-production-rollout.md`.
3. Set API `DIGEST_JOB_SECRET` and `EMAIL_DAILY_SEND_LIMIT`.
4. Set web `CRON_SECRET` and matching `DIGEST_JOB_SECRET`.
5. Deploy API and web.
6. Run a production dry run without `digestDate` to validate scheduled per-user local-date behavior; use an explicit `digestDate` only for a targeted backfill check.
7. Confirm output counts, TaskForge logs, delivery history, Resend logs, alert delivery, and quota visibility.
8. Run manual-only sends first; keep scheduled sends disabled until observability checks pass.
9. Enable Vercel Cron for the web route `GET /api/cron/digest`.
10. Keep GitHub Actions schedule disabled unless it is the chosen fallback.

## Operational Notes

- Do not run both Vercel Cron and GitHub Actions on the same schedule unless one is dry-run only.
- The web cron proxy does not supply `digestDate` by default. The API runner computes each user's local digest date from `dailyDigestTimezone`, and treats existing `SENT` or `PENDING` attempts for that same user/local-date pair as duplicates.
- Failed provider attempts count against the daily send budget because they may still consume provider quota.
- Template render failures are recorded as failed attempts but do not count against the provider send budget.
- Provider failures are classified as `PROVIDER_QUOTA_EXHAUSTED`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `TEMPLATE_RENDER_FAILED`, `RECIPIENT_REJECTED`, or `PROVIDER_TRANSIENT_FAILURE`.
- Retry behavior: do not retry quota failures in the same run; remaining eligible sends are recorded as `SKIPPED` and reported as `providerQuotaSkipped`. Rate-limit and transient failures are retryable in future runs once provider conditions recover.
- If the configured TaskForge budget is exhausted, remaining eligible sends are recorded as `SKIPPED` with `BUDGET_SKIPPED` and reported as `budgetSkipped`.
- Vercel Cron may invoke jobs more than once or overlap slow jobs; the database delivery keys and pending-attempt checks are the primary duplicate-send guard.
- Vercel Cron does not retry failed invocations, so check API/web logs after first enablement and after any schedule changes.
- Use `docs/prod/email-observability-runbook.md` during first-rollout review.
- Production email monitoring, budget exhaustion, and scheduled-send enablement decisions are recorded in `docs/prod/adr/0007-email-observability-rollout-decisions.md`.
