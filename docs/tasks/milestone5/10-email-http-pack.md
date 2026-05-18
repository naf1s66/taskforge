# Task: Add email HTTP pack

## Summary
- Extend the API `.http` collections with email preference, digest preview, and manual send flows.
- Make local MailHog verification repeatable for reviewers.

**Status:** New.

## Acceptance Criteria
- [ ] HTTP examples cover auth setup, reading/updating preferences, previewing digest payloads, and dry-run send.
- [ ] Manual send example documents expected MailHog result and idempotency behavior.
- [ ] Variables are environment-driven and do not hard-code real SMTP credentials.
- [ ] HTTP linting includes the new email collection.

## Notes
- Keep examples safe by default; real send flows should target local MailHog unless explicitly configured.
