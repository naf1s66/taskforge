# Task: Add automated tests for email flows

## Summary
- Cover the email adapter, digest service, scheduler, API endpoints, and frontend preference UI.
- Keep tests deterministic by mocking SMTP delivery and time.

**Status:** New.

## Acceptance Criteria
- [ ] API tests cover preferences, welcome email idempotency, digest preview, manual send, and scheduler outcomes.
- [ ] Email template tests snapshot or assert subject/plaintext/HTML essentials without brittle full-body snapshots.
- [ ] Frontend tests cover preference toggles, optimistic rollback, and digest preview states.
- [ ] CI runs the new suites within acceptable time and without sending external email.

## Notes
- Use fixed dates/timezones for digest window tests.
- Prefer fake transports or adapter mocks for automated coverage; reserve MailHog for manual/local smoke tests.
