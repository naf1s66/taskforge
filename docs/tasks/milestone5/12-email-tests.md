# Task: Add automated tests for email flows

## Summary
- Cover the email adapter, digest service, scheduler, API endpoints, and frontend preference UI.
- Keep tests deterministic by mocking SMTP delivery and time.

**Status:** Completed.

## Acceptance Criteria
- [x] API tests cover preferences, welcome email idempotency, digest preview, manual send, and scheduler outcomes.
- [x] Email template tests snapshot or assert subject/plaintext/HTML essentials without brittle full-body snapshots.
- [x] Frontend tests cover preference toggles, optimistic rollback, and digest preview states.
- [x] Config tests cover local MailHog defaults, Resend production SMTP settings, missing secret failures, and placeholder credential rejection.
- [x] Scheduler tests cover send-budget exhaustion so Resend free-tier limits cannot be exceeded silently.
- [x] CI runs the new suites within acceptable time and without sending external email.

## Manual Setup Required
- Keep CI on mocked/fake SMTP transports only.
- If a Resend integration smoke is ever added, make it an explicit opt-in workflow with separate secrets and a tiny recipient allowlist.
- Do not require a real Resend account for the default developer test path.

## Notes
- Use fixed dates/timezones for digest window tests.
- Prefer fake transports or adapter mocks for automated coverage; reserve MailHog for manual/local smoke tests.

## Completion Notes
- API coverage exists in `email-preferences-route.test.ts`, `auth.e2e.test.ts`, `email-digest-route.test.ts`, `jobs-route.test.ts`, `daily-digest-runner.test.ts`, `email-adapter.test.ts`, `smtp-config.test.ts`, and `digest-config.test.ts`.
- Email template assertions verify deterministic subject/plaintext/HTML essentials without full-body snapshots.
- Frontend coverage exists in `dashboard-content.test.tsx` for preference toggles and digest preview states, plus `email-preferences-hooks.test.tsx` for query loading, optimistic update success, and rollback after failed preference updates.
- Config and scheduler tests cover MailHog defaults, Resend production SMTP settings, missing/placeholder secrets, malformed budgets, and send-budget exhaustion.
- CI runs the API Jest and web Vitest suites through existing workflow steps using fake transports or adapter mocks only; no default path requires Resend secrets or external email delivery.
