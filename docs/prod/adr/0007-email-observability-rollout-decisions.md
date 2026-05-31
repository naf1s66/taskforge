# ADR 0007 - Email Observability Rollout Decisions

**Status:** Accepted

## Context
Milestone 5 task 09 adds email observability and safety controls before scheduled digest sends are enabled in production. The implementation needs clear rollout decisions for monitoring ownership, send budget exhaustion, and the order for enabling Resend-backed scheduled sends.

These decisions apply to the first production rollout of TaskForge email delivery and should be revisited after real delivery volume, failure rate, and Resend quota behavior are understood.

## Decision 1: Monitoring Model
Use automated alerts plus daily human review during the first production rollout.

Operational requirements:

- Configure automated alerts for Resend delivery failures, provider quota exhaustion, and provider rate-limit exhaustion before scheduled digest sends are enabled.
- Route alerts to a monitored destination such as the production owner email, operations inbox, or team alert channel.
- Assign a human reviewer for each rollout day to check TaskForge delivery history, application logs, Resend logs, and quota state at least once per day.
- Do not require a dedicated live on-call rotation for the first rollout unless email volume or customer impact increases.

Rationale:

- Automated alerts reduce the chance that provider failures or quota exhaustion are missed between manual checks.
- Daily review keeps ownership explicit without adding heavy operational process before product usage justifies it.
- This model is appropriate for a low-volume first rollout, but it is not enough for high-volume or customer-critical email.

Consequences:

- The production launch checklist must include an assigned daily reviewer.
- Alerts must be verified before scheduled digest sends are enabled.
- If repeated failures are seen during daily review, scheduled sends should remain disabled or be paused until the cause is classified.

## Decision 2: Send Budget Exhaustion Behavior
When the configured production send budget is exhausted, skip remaining eligible digests and report them as budget-skipped.

Operational requirements:

- Treat budget exhaustion as a controlled skip outcome, not as an unbounded retry condition.
- Record skipped delivery attempts with the explicit `SKIPPED` status and a budget-skipped reason.
- Include budget-skipped counts in job responses, logs, and rollout review notes.
- Do not aggressively retry quota or budget failures in the same run; let the next scheduled run decide whether delivery should resume.
- Keep `EMAIL_DAILY_SEND_LIMIT` below the provider limit on the free plan unless a paid plan or higher quota has been intentionally configured.

Rationale:

- Skipping remaining digests prevents unexpected spend and avoids repeatedly hitting provider limits.
- Explicit budget-skipped records make the missed delivery behavior auditable.
- A controlled skip is easier to reason about than failing the whole run after some users already received mail.

Consequences:

- Implementation should prefer explicit status transitions over boolean sent flags.
- Product and support review should treat budget-skipped users as intentionally not sent for that run.
- Budget exhaustion is still an operational issue and should trigger alert review, but it should not cause aggressive same-run retries.

## Decision 3: Scheduled Send Enablement Sequence
Start with manual-only sends, verify Resend visibility, then enable scheduled sends.

Operational requirements:

1. Complete Resend account, sender, DNS, and secret setup.
2. Configure automated alerts and confirm the daily reviewer.
3. Run production-like dry runs and manual sends only.
4. Verify that TaskForge logs, delivery history, Resend logs, alert delivery, and quota visibility are available to the reviewer.
5. Enable the scheduled digest path only after the manual-only checks pass.

Rationale:

- Manual-only rollout limits blast radius while confirming the observability path works end to end.
- Verifying Resend logs and alerts before scheduled sends avoids blind failures on the first automated runs.
- The staged approach fits the existing digest scheduler design from ADR 0006.

Consequences:

- Vercel Cron and any GitHub Actions scheduled fallback must remain disabled until the visibility checks pass.
- The first scheduled runs should be reviewed daily using the monitoring model from this ADR.
- If alerting or Resend log access is unavailable, scheduled sends should not be enabled.

