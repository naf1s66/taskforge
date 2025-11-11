# Task: Connect NextAuth to Prisma adapter

## Summary
- Use the Prisma adapter so OAuth and credential flows persist users, accounts, and sessions in the shared database.
- Keep NextAuth user IDs aligned with the backend JWT `sub` so API and frontend agree on identities.

**Status:** Completed — NextAuth uses the Prisma adapter so OAuth + credentials share user/account/session rows.

## Acceptance Criteria
- [x] NextAuth configuration registers the Prisma adapter and reuses the existing `@prisma/client` instance.
- [x] Successful OAuth or credential sign-ins create/update `User`, `Account`, and `Session` rows defined in `prisma/schema.prisma`.
- [x] Logs confirm matching user IDs between NextAuth tokens and API-issued JWTs.
- [x] Local dev instructions describe running the required Prisma migrations before starting NextAuth.

## Notes
- Coordinate with the `oauth-api-session-bridge` task so API cookies are issued once Prisma records exist.
- Ensure adapter usage does not break the current fallback credential provider used during development.
- `apps/web/lib/auth-config.ts` imports `PrismaAdapter`, plugs it into `NextAuth`, normalizes emails, and logs JWT/session callbacks confirming IDs match the API.
- README “Authentication Reference” now calls out Prisma migrations + `.env` requirements before launching NextAuth so dev setup stays smooth.
