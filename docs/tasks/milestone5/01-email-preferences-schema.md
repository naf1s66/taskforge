# Task: Add email preferences schema

## Summary
- Add user-scoped settings for welcome and daily digest email behavior.
- Persist notification delivery attempts so email sends are auditable and idempotent.

**Status:** Completed.

## Acceptance Criteria
- [x] Prisma schema includes email preference fields or a dedicated `EmailPreference` model keyed by user.
- [x] Notification delivery attempts are stored with type, recipient, status, provider metadata, error details, and timestamps.
- [x] Migrations are generated and can be applied to a clean local database.
- [x] Seed data includes deterministic email preference defaults for the local demo user.

## Notes
- Default digest state should be conservative until the UI and delivery safeguards are ready.
- Keep the schema compatible with ADR 0003's SMTP adapter and future multi-provider support.

## Implementation Notes
- Added `EmailPreference` with conservative daily digest defaults and a database check that allows only UTC hours 0-23 when a digest hour is set.
- Added `NotificationDelivery` for idempotent logical notifications and `NotificationDeliveryAttempt` for auditable provider send attempts.
- Seed data upserts the local demo user's default email preferences deterministically.
