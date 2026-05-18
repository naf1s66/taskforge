# Task: Add automated tests for email flows

## Summary
- Cover the email adapter, digest service, scheduler, API endpoints, and frontend preference UI.
- Keep tests deterministic by mocking SMTP delivery and time.

**Status:** New.

## Acceptance Criteria
- [ ] API tests cover preferences, welcome email idempotency, digest preview, manual send, and scheduler outcomes.
- [ ] Email template tests snapshot or assert subject/plaintext/HTML essentials without brittle full-body snapshots.
- [ ] Frontend tests cover preference toggles, optimistic rollback, and digest preview states.
- [ ] Config tests cover local MailHog defaults, Resend production SMTP settings, missing secret failures, and placeholder credential rejection.
- [ ] Scheduler tests cover send-budget exhaustion so Resend free-tier limits cannot be exceeded silently.
- [ ] CI runs the new suites within acceptable time and without sending external email.

## Manual Setup Required
- Keep CI on mocked/fake SMTP transports only.
- If a Resend integration smoke is ever added, make it an explicit opt-in workflow with separate secrets and a tiny recipient allowlist.
- Do not require a real Resend account for the default developer test path.

## Notes
- Use fixed dates/timezones for digest window tests.
- Prefer fake transports or adapter mocks for automated coverage; reserve MailHog for manual/local smoke tests.
