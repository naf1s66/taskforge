# Task: Add email observability and safety controls

## Summary
- Make email delivery diagnosable without leaking sensitive content.
- Add safeguards around repeated sends, provider failures, and manual trigger abuse.

**Status:** New.

## Acceptance Criteria
- [ ] Email sends emit structured logs with notification type, user id, delivery status, and provider response metadata.
- [ ] Delivery history stores failure details safely without full rendered email bodies.
- [ ] Manual send endpoints enforce rate limits and idempotency.
- [ ] Retry behavior is documented and tested for transient provider failures.

## Notes
- Avoid logging recipient content beyond the minimum needed for debugging.
- Prefer explicit status transitions over ambiguous boolean sent flags.
