# Task: Add email HTTP pack

## Summary
- Extend the API `.http` collections with email preference, digest preview, and manual send flows.
- Make local MailHog verification repeatable for reviewers.

**Status:** New.

## Acceptance Criteria
- [ ] HTTP examples cover auth setup, reading/updating preferences, previewing digest payloads, and dry-run send.
- [ ] Manual send example documents expected MailHog result and idempotency behavior.
- [ ] Variables are environment-driven and do not hard-code real SMTP credentials.
- [ ] Production SMTP examples show Resend variable names and placeholder values only.
- [ ] HTTP linting includes the new email collection.

## Manual Setup Required
- Use MailHog for local HTTP-pack verification by default.
- Only run real Resend sends from the HTTP pack after the Resend domain is verified and production-like secrets are loaded from the local environment.
- Before any real-send example is merged, confirm it is opt-in and cannot run accidentally in CI.

## Notes
- Keep examples safe by default; real send flows should target local MailHog unless explicitly configured.
