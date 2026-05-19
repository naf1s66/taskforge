# Task: Send welcome emails

## Summary
- Send a welcome email after a user's first successful account creation.
- Support both credentials registration and OAuth-created accounts without duplicate sends.

**Status:** Completed.

## Acceptance Criteria
- [x] Credentials registration queues or sends one welcome email after the user is persisted.
- [x] OAuth account creation sends one welcome email only for first-time users, not every login.
- [x] Welcome sends are recorded in notification delivery history.
- [x] Failures do not block successful auth, but they are logged and visible in delivery records.

## Notes
- Use idempotency keyed by user and notification type so retries do not duplicate welcome emails.
- Keep copy minimal and product-specific; avoid marketing language until a real launch flow exists.

## Completion Notes
- Credentials registration records welcome email delivery through the API notification service after user persistence, then dispatches SMTP outside the auth response path.
- OAuth account creation schedules welcome delivery through a bridge-secret-protected API endpoint so the API remains the single owner of SMTP configuration, templates, and delivery history.
- Delivery idempotency uses `welcome:{userId}` and skips existing `SENT` or fresh `PENDING` attempts; stale pending attempts are failed and retried so process restarts do not suppress welcome emails forever.
- SMTP failures are stored as failed delivery attempts and logged asynchronously without rejecting successful auth.
