# ADR 0006 - Digest Scheduler Invocation

**Status:** Accepted

## Context
TaskForge needs a daily digest runner that works on free-tier hosting and respects Resend's free daily send budget. The runner must be deterministic, manually dry-runnable, and safe to invoke from CI or hosted scheduling without requiring an always-on worker.

The current production topology targets Vercel for the web app, Render or Railway for the API, and Neon or Supabase for Postgres. Pricing-sensitive notes below were checked against official docs on 2026-05-19. Free-tier constraints matter:

- Vercel Cron is available on all plans, but Hobby cron runs at most once per day with hourly scheduling precision.
- GitHub Actions scheduled workflows can run within the repository owner's free included minutes, but schedules may be delayed or dropped during high load.
- Render Cron Jobs have a minimum monthly charge per cron job service, so they do not satisfy a strict free-only requirement.
- Railway offers a limited free/trial path and paid Hobby usage, so relying on Railway scheduling for production is not the default free-only choice.

## Decision
Implement digest delivery as an explicit API job endpoint backed by the same deterministic runner used by local scripts and CI smoke checks.

Production invocation should prefer:

1. Vercel Cron calling the protected API job endpoint when the deployed topology can support it within Hobby limits.
2. GitHub Actions scheduled workflow calling the same endpoint as the free fallback.

The endpoint must require a shared job secret, support dry-run mode, accept an explicit digest date window, and pass an `EMAIL_DAILY_SEND_LIMIT` budget guard to the runner. Production defaults should assume Resend's free daily limit unless the account is upgraded.

Do not use an always-running `node-cron` worker for the production digest schedule.

## Consequences
- The digest schedule remains compatible with sleeping or cold-starting free-tier API hosts because the job is triggered by an inbound request.
- The runner stays testable without waiting for wall-clock time because date windows and dry-run behavior are explicit inputs.
- Vercel Cron gives the cleanest free deployment path for one daily digest, but exact timing is not guaranteed on Hobby.
- GitHub Actions is a workable fallback, but schedule delivery is best-effort and should not be the only source of observability.
- The protected endpoint adds a security requirement: production must configure a strong `DIGEST_JOB_SECRET` and reject unauthenticated job requests.
- Render-native cron can be reconsidered if TaskForge moves off a strict free-only requirement.

## References
- Vercel Cron usage and pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel Cron security: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- GitHub Actions billing and usage: https://docs.github.com/actions/learn-github-actions/usage-limits-billing-and-administration
- GitHub Actions schedule event behavior: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows
- Render Cron Jobs billing: https://render.com/docs/cronjobs
- Railway pricing: https://docs.railway.com/pricing
- Resend pricing: https://resend.com/pricing
