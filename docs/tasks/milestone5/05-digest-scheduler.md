# Task: Add digest scheduler

## Summary
- Add a deterministic daily digest runner that can be called by a hosted scheduler, local script, or CI smoke.
- Ensure every eligible user is processed once per digest window.

**Status:** New.

## Acceptance Criteria
- [ ] A CLI/script or protected job endpoint can run digest delivery for a target date window.
- [ ] Runner respects user email preferences and skips users without a verified or deliverable email.
- [ ] Idempotency prevents duplicate sends for the same user and digest date.
- [ ] Runner accepts an `EMAIL_DAILY_SEND_LIMIT` or equivalent budget guard; default production docs should assume Resend's free daily limit unless a paid plan is configured.
- [ ] Job output reports attempted, sent, skipped, and failed counts.

## Manual Setup Required
- Decide how production will invoke the digest runner: hosted cron, platform scheduler, or a protected job endpoint.
- Set the production digest send budget before enabling the job. For the Resend free plan, keep the budget at or below 100 emails per day unless the account is upgraded.
- Confirm the first production schedule with a dry run before enabling real sends.

## Notes
- Prefer an explicit invocation path over an always-running worker so free-tier hosting remains viable.
- Make scheduler behavior testable without waiting for wall-clock time.
- Resend pricing reference for the free daily limit: https://resend.com/pricing
