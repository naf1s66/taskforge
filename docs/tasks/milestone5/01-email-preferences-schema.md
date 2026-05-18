# Task: Add email preferences schema

## Summary
- Add user-scoped settings for welcome and daily digest email behavior.
- Persist notification delivery attempts so email sends are auditable and idempotent.

**Status:** New.

## Acceptance Criteria
- [ ] Prisma schema includes email preference fields or a dedicated `EmailPreference` model keyed by user.
- [ ] Notification delivery attempts are stored with type, recipient, status, provider metadata, error details, and timestamps.
- [ ] Migrations are generated and can be applied to a clean local database.
- [ ] Seed data includes deterministic email preference defaults for the local demo user.

## Notes
- Default digest state should be conservative until the UI and delivery safeguards are ready.
- Keep the schema compatible with ADR 0003's planned SMTP adapter and future multi-provider support.
