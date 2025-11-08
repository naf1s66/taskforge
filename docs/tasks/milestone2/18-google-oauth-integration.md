# Task: Integrate Google OAuth 2.0

## Summary
- Add Google OAuth 2.0 support to the auth stack (API + NextAuth) to allow social sign-in.
- Handle account linking between OAuth profiles and existing credential users when emails overlap.

**Status:** Pending � providers are declared but no Google credentials, database adapter, or linking logic is wired.

## Acceptance Criteria
- [ ] Google OAuth client credentials are consumed from environment variables and documented.
- [ ] Users can complete the OAuth login flow end-to-end (frontend → backend → persisted session).
- [ ] New OAuth users create entries in the database that align with the Prisma auth models.
- [ ] Existing credential users can link Google accounts without duplicating records.

## Notes
- Reuse NextAuth provider configuration patterns described in ADR 0001.
- Update README/Docs with any manual steps (e.g., Google Cloud Console setup).
