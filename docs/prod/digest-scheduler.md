# Production Digest Scheduler

TaskForge sends daily digests through an explicit runner, not an always-running worker. The runner can be invoked by the API job endpoint, the local CLI, or a CI smoke check.

## Production Shape

- Preferred free scheduler: Vercel Cron calls the web proxy route `GET /api/cron/digest`.
- Web proxy: validates Vercel's `Authorization: Bearer <CRON_SECRET>` header, then forwards to the API.
- API job endpoint: `GET` or `POST /api/taskforge/v1/jobs/digest`.
- API job auth: `Authorization: Bearer <DIGEST_JOB_SECRET>` or `x-job-secret: <DIGEST_JOB_SECRET>`.
- Free fallback scheduler: GitHub Actions scheduled workflow calling the API endpoint directly.

## Required Environment

Set these values before enabling real sends:

- API: `DIGEST_JOB_SECRET`
- API: `EMAIL_DAILY_SEND_LIMIT=90`
- Web: `CRON_SECRET`
- Web: `DIGEST_JOB_SECRET`

The web and API `DIGEST_JOB_SECRET` values must match. Keep `EMAIL_DAILY_SEND_LIMIT` at `90` on the Resend free plan unless there is an intentional reason to use the full 100-message quota.

## Request Contract

`POST /api/taskforge/v1/jobs/digest`

```json
{
  "digestDate": "2026-05-19",
  "dryRun": true,
  "sendLimit": 90,
  "digestHourUtc": 8
}
```

`GET /api/taskforge/v1/jobs/digest?digestDate=2026-05-19&dryRun=true&sendLimit=90&digestHourUtc=8`

- `digestDate`: required `YYYY-MM-DD` calendar date for the idempotency window.
- `dryRun`: optional boolean; when true, reports would-send counts without sending email or recording deliveries.
- `sendLimit`: optional non-negative integer; defaults to `EMAIL_DAILY_SEND_LIMIT`.
- `digestHourUtc`: optional integer `0` through `23`; when set, users with a different configured digest hour are skipped.

The response includes `attempted`, `sent`, `skipped`, `failed`, and skip reason counts.

## Local Verification

Run a dry run from the API package:

```bash
pnpm -C apps/api digest:run 2026-05-19 --dry-run
```

Run the protected API endpoint locally:

```bash
curl -X POST http://localhost:4000/api/taskforge/v1/jobs/digest \
  -H "content-type: application/json" \
  -H "x-job-secret: $DIGEST_JOB_SECRET" \
  -d '{"digestDate":"2026-05-19","dryRun":true,"sendLimit":90}'
```

## Production Enablement

1. Complete `docs/prod/resend-email-setup.md`.
2. Set API `DIGEST_JOB_SECRET` and `EMAIL_DAILY_SEND_LIMIT`.
3. Set web `CRON_SECRET` and matching `DIGEST_JOB_SECRET`.
4. Deploy API and web.
5. Run a production dry run for the intended `digestDate`.
6. Confirm output counts, TaskForge logs, delivery history, Resend logs, alert delivery, and quota visibility.
7. Run manual-only sends first; keep scheduled sends disabled until observability checks pass.
8. Enable Vercel Cron for the web route `GET /api/cron/digest`.
9. Keep GitHub Actions schedule disabled unless it is the chosen fallback.

## Operational Notes

- Do not run both Vercel Cron and GitHub Actions on the same schedule unless one is dry-run only.
- The API runner treats existing `SENT` or `PENDING` attempts for the same user/date as duplicates.
- Failed provider attempts count against the daily send budget because they may still consume provider quota.
- Provider failures are classified as `PROVIDER_QUOTA_EXHAUSTED`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `TEMPLATE_RENDER_FAILED`, `RECIPIENT_REJECTED`, or `PROVIDER_TRANSIENT_FAILURE`.
- Retry behavior: do not retry quota failures in the same run; record and let the next scheduled/manual run decide. Rate-limit and transient failures are retryable in future runs once provider conditions recover.
- If the budget is exhausted, remaining eligible sends are skipped and reported as `budgetSkipped`.
- Vercel Cron may invoke jobs more than once or overlap slow jobs; the database delivery keys and pending-attempt checks are the primary duplicate-send guard.
- Vercel Cron does not retry failed invocations, so check API/web logs after first enablement and after any schedule changes.
- Production email monitoring, budget exhaustion, and scheduled-send enablement decisions are recorded in `docs/prod/adr/0007-email-observability-rollout-decisions.md`.
