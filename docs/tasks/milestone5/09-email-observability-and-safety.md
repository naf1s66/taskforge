# Task: Add email observability and safety controls

## Summary
- Make email delivery diagnosable without leaking sensitive content.
- Add safeguards around repeated sends, provider failures, and manual trigger abuse.

**Status:** New.

## Acceptance Criteria
- [ ] Email sends emit structured logs with notification type, user id, delivery status, and provider response metadata.
- [ ] Delivery history stores failure details safely without full rendered email bodies.
- [ ] Manual send endpoints enforce rate limits and idempotency.
- [ ] Provider quota and rate-limit failures are classified separately from template, auth, and recipient failures.
- [ ] Retry behavior is documented and tested for transient provider failures.

## Manual Setup Required
- Decide who monitors Resend delivery failures and quota exhaustion during the first production rollout.
- Confirm whether production should fail closed when the send budget is exhausted or skip remaining digests and report them as budget-skipped.
- Review Resend account alerts/log access before enabling scheduled digest sends.

## Notes
- Avoid logging recipient content beyond the minimum needed for debugging.
- Prefer explicit status transitions over ambiguous boolean sent flags.
- Do not retry quota failures aggressively; record them and let the next scheduled run decide whether to send.
