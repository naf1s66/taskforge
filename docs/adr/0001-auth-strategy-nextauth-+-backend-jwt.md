# ADR 0001 — Auth Strategy (NextAuth + backend JWT)

**Status:** Accepted — updated after NextAuth/Next.js ↔ API bridge landed

## Context
- The web app must offer GitHub and Google OAuth alongside email/password login without duplicating identity stores.
- Backend APIs expect JWT Bearer tokens (surfaced as the HttpOnly `tf_session` cookie) to authorize requests and must
  continue to work for direct credential logins from the web forms and scripted clients.
- Docker deployments exposed cross-origin concerns that required a deterministic way for the Next.js app to obtain API
  cookies after OAuth hand-offs.

## Decision
- Continue using **NextAuth (Auth.js)** with the Prisma adapter so OAuth and credential users share the same user IDs that
  the API encodes inside JWTs.
- Keep NextAuth in **database session** mode; the adapter updates the shared `User`, `Account`, and `Session` tables and
  normalizes OAuth email casing/verification before issuing sessions.
- Introduce a trusted **session bridge**: the Next.js server exchanges the signed-in NextAuth user for API tokens by
  calling `POST /api/taskforge/v1/auth/session-bridge` with a shared `SESSION_BRIDGE_SECRET`. The API reuses its token
  service to mint access/refresh tokens, sets the `tf_session` HttpOnly cookie, and returns the payload for observability.
- Preserve the existing `/api/taskforge/v1/auth/login` credential flow. The Next.js login form posts directly to the API
  and depends on the same cookie path, keeping parity with CLI and integration tests.
- Coordinate sign-out through the App Router endpoint `/api/auth/logout`, which calls the API logout route and expires
  both cookies, ensuring OAuth and JWT sessions terminate together.

## Consequences
- ✅ **Unified identity:** A single user record spans OAuth and credentials, preventing mismatched `sub` claims between
  NextAuth and API tokens.
- ✅ **Portable session bridge:** Protected routes work in dev, Docker, and production by reissuing API cookies on demand
  without leaking API secrets to the browser.
- ⚠️ **Secret management:** Operations must distribute `NEXTAUTH_SECRET`, `JWT_SECRET`, and `SESSION_BRIDGE_SECRET` to
  both apps and rotate them together.
- ⚠️ **Bridge availability:** If the API is down during OAuth callback, the Next.js app must handle bridge failures and
  prompt users to retry (implemented via session-bridge route guards).
