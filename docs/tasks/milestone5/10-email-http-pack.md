# Task: Add email HTTP pack

## Summary
- Extend the API `.http` collections with email preference, digest preview, and manual send flows.
- Make local MailHog verification repeatable for reviewers.

**Status:** Completed.

## Acceptance Criteria
- [x] HTTP examples cover auth setup, reading/updating preferences, previewing digest payloads, and dry-run send.
- [x] Manual send example documents expected MailHog result and idempotency behavior.
- [x] Variables are environment-driven and do not hard-code real SMTP credentials.
- [x] Production SMTP examples show Resend variable names and placeholder values only.
- [x] HTTP linting includes the new email collection.

## Manual Setup Required
- Use MailHog for local HTTP-pack verification by default.
- Only run real Resend sends from the HTTP pack after the Resend domain is verified and production-like secrets are loaded from the local environment.
- Before any real-send example is merged, confirm it is opt-in and cannot run accidentally in CI.

## Notes
- Keep examples safe by default; real send flows should target local MailHog unless explicitly configured.

## Completion Notes
- Added `apps/api/tests/email.http` with seeded demo auth, preference read/update, digest preview, safe dry-run, guarded MailHog delivery, and disabled production-like Resend examples.
- Updated `apps/api/prisma/seed.ts` so local reviewers can repeat MailHog verification with a verified `demo@taskforge.dev` user and deterministic digest task.
- Kept real delivery opt-in with `@mailhogDeliveryDryRun=true` by default; reviewers must flip it to `false` only after confirming the API is local and SMTP points to MailHog.
- `pnpm -C apps/api run lint:http` validates the new email collection with the existing HTTP linter.
