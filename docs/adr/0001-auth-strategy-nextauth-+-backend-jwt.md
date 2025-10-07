# ADR 0001 — Auth Strategy (NextAuth + backend JWT)

**Status:** Accepted

## Context
We need OAuth (GitHub/Google) on FE with minimal friction and a way for the API to trust requests.

## Decision
Use **NextAuth (Auth.js)** in the Next.js app for OAuth, store session securely, and forward a **Bearer JWT** to the API on requests. API validates JWT with shared secret.

## Consequences
- Easy provider setup, free/open-source.
- Clear separation FE session vs. API auth.
- Requires key management (NEXTAUTH_SECRET, JWT_SECRET).
