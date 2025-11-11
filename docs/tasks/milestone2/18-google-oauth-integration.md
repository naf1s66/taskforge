# Task: Integrate Google OAuth 2.0

## Summary
- Add Google OAuth 2.0 support to the auth stack (API + NextAuth) to allow social sign-in.
- Handle account linking between OAuth profiles and existing credential users when emails overlap.

**Status:** Completed - Google provider now runs through NextAuth with the Prisma adapter and feeds the API session bridge once Google issues a callback.

## Acceptance Criteria
- [x] Google OAuth client credentials are consumed from environment variables and documented.
- [x] Users can complete the OAuth login flow end-to-end (frontend -> backend -> persisted session).
- [x] New OAuth users create entries in the database that align with the Prisma auth models.
- [x] Existing credential users can link Google accounts without duplicating records.

## Notes
- `apps/web/lib/auth-config.ts` wires Google alongside GitHub, normalizes emails, links accounts via the Prisma adapter, and keeps sessions in database mode so the API/user IDs stay in sync.
- Populate `GOOGLE_ID` / `GOOGLE_SECRET` in `.env` after creating an OAuth consent screen + Web application credentials in the **Google Cloud Console** (documented in README and `docs/testing/milestone2-manual-checklist.md`). Without that setup the provider button remains hidden.
- Once Google responds, the Next.js `/auth/session-bridge` route exchanges the verified user for API JWTs so OAuth, credential, and session logout paths work identically.

