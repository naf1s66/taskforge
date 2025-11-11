# Task: Configure frontend authentication framework

## Summary
- Wire up NextAuth.js (preferred) or a custom JWT client to manage authentication on the Next.js side.
- Ensure the configuration matches backend capabilities and environment variables.

**Status:** Completed (merged).

## Acceptance Criteria
- [x] Next.js app has an auth provider configured (e.g., `/app/api/auth/[...nextauth]/route.ts`).
- [x] Environment variables for secrets and providers are referenced instead of hard-coded values.
- [x] Client-side session retrieval works via provided hooks/components.

## Notes
- Follow ADR 0001 guidance for blending NextAuth with backend JWT usage.
- Coordinate with UI tasks to expose login/logout actions in the interface.
