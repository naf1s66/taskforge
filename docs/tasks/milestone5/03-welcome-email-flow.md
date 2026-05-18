# Task: Send welcome emails

## Summary
- Send a welcome email after a user's first successful account creation.
- Support both credentials registration and OAuth-created accounts without duplicate sends.

**Status:** New.

## Acceptance Criteria
- [ ] Credentials registration queues or sends one welcome email after the user is persisted.
- [ ] OAuth account creation sends one welcome email only for first-time users, not every login.
- [ ] Welcome sends are recorded in notification delivery history.
- [ ] Failures do not block successful auth, but they are logged and visible in delivery records.

## Notes
- Use idempotency keyed by user and notification type so retries do not duplicate welcome emails.
- Keep copy minimal and product-specific; avoid marketing language until a real launch flow exists.
