# Task: Add email observability and safety controls

## Summary
- Make email delivery diagnosable without leaking sensitive content.
- Add safeguards around repeated sends, provider failures, and manual trigger abuse.

**Status:** Completed.

## Acceptance Criteria
- [x] Email sends emit structured logs with notification type, user id, delivery status, and provider response metadata.
- [x] Delivery history stores failure details safely without full rendered email bodies.
- [x] Manual send endpoints enforce rate limits and idempotency.
- [x] Provider quota and rate-limit failures are classified separately from template, auth, and recipient failures.
- [x] Retry behavior is documented and tested for transient provider failures.

## Manual Setup Required
- Configure automated alerts for Resend delivery failures, provider quota exhaustion, and provider rate-limit exhaustion.
- Assign a daily human reviewer for the first production rollout.
- Keep scheduled digest sends disabled until manual-only sends confirm TaskForge logs, delivery history, Resend logs, alert delivery, and quota visibility.

## Production Decisions
- Monitoring model: use automated alerts plus daily human review during the first production rollout.
- Send budget exhaustion: skip remaining eligible digests and report them as budget-skipped; do not fail the whole run solely because the configured budget is exhausted.
- Scheduled-send enablement: start with manual-only sends, verify Resend visibility, then enable scheduled sends.
- Source of truth: `docs/prod/adr/0007-email-observability-rollout-decisions.md`.

## Notes
- Avoid logging recipient content beyond the minimum needed for debugging.
- Prefer explicit status transitions over ambiguous boolean sent flags.
- Do not retry quota failures aggressively; record them and let the next scheduled run decide whether to send.

## Completion Notes
- Added shared email delivery observability for welcome and daily digest sends.
- Provider send results store only safe metadata: provider message id, accepted/rejected counts, and capped provider response text.
- Delivery failures are classified as `PROVIDER_QUOTA_EXHAUSTED`, `PROVIDER_RATE_LIMITED`, `PROVIDER_AUTH_FAILED`, `TEMPLATE_RENDER_FAILED`, `RECIPIENT_REJECTED`, or `PROVIDER_TRANSIENT_FAILURE`.
- Configured budget exhaustion and provider quota halts create auditable `SKIPPED` delivery attempts.
- Manual digest sends use a stricter authenticated-user rate limit and return the logical `x-taskforge-idempotency-key`.
- Production review steps are documented in `docs/prod/email-observability-runbook.md`.
