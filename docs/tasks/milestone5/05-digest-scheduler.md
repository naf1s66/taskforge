# Task: Add digest scheduler

## Summary
- Add a deterministic daily digest runner that can be called by a protected job endpoint, local script, or CI smoke.
- Ensure every eligible user is processed once per digest window.

**Status:** New.

## Production Invocation Decision
- Accepted decision: use a protected API job endpoint backed by the deterministic runner. See `docs/prod/adr/0006-digest-scheduler-invocation.md`.
- Preferred free production caller: Vercel Cron, limited to daily Hobby cadence and hourly timing precision.
- Free fallback caller: GitHub Actions scheduled workflow calling the same endpoint, with best-effort timing.
- Avoid an always-running `node-cron` worker in production because free-tier hosts can sleep, restart, or scale down.

## Acceptance Criteria
- [ ] A protected job endpoint can run digest delivery for a target date window and requires a shared job secret.
- [ ] The same runner can be invoked by a local script or CI smoke without depending on wall-clock time.
- [ ] Runner respects user email preferences and skips users without a verified or deliverable email.
- [ ] Idempotency prevents duplicate sends for the same user and digest date.
- [ ] Runner accepts an `EMAIL_DAILY_SEND_LIMIT` or equivalent budget guard; default production docs assume Resend's free daily limit unless a paid plan is configured.
- [ ] Job output reports attempted, sent, skipped, and failed counts.
- [ ] Dry-run mode reports the same counts without recording successful delivery or sending real email.

## Manual Setup Required
- Configure `DIGEST_JOB_SECRET` in production before exposing the job endpoint.
- Configure the free production caller after deployment: Vercel Cron is preferred; GitHub Actions schedule is the fallback.
- Set `EMAIL_DAILY_SEND_LIMIT` before enabling the job. For the Resend free plan, keep the budget at or below 100 emails per day unless the account is upgraded.
- Confirm the first production schedule with a dry run before enabling real sends.

## Notes
- Prefer an explicit invocation path over an always-running worker so free-tier hosting remains viable.
- Make scheduler behavior testable without waiting for wall-clock time.
- Keep scheduler timing expectations loose on free tiers; the digest date window must drive behavior, not the exact trigger minute.
- Resend pricing reference for the free daily limit: https://resend.com/pricing
