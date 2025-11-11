# Task: Bridge NextAuth OAuth logins with API JWT cookies

## Summary
- After a user signs in via NextAuth (GitHub/Google), request a JWT from the API so `tf_session` is issued and backend routes honor the login.
- Ensure sign-out clears both the NextAuth session and the API cookie so auth state stays consistent across stacks.

**Status:** Complete.

## Acceptance Criteria
- [x] NextAuth callbacks or server actions exchange the OAuth session for an API JWT (e.g., by calling `/api/taskforge/v1/auth/login` or a dedicated bridge endpoint).
- [x] Successful OAuth sign-in results in the `tf_session` cookie being set in the browser alongside the NextAuth session cookie.
- [x] Logging out via the site header clears the API cookie (`/auth/logout`) in addition to ending the NextAuth session.
- [x] Docs describe how this bridge works so future contributors understand the dual-session story.

## Notes
- Coordinate with backend teammates on whether a dedicated "session sync" endpoint is preferable to reusing the credential login route.
- Ensure CSRF protections and error handling are in place when calling the API from NextAuth callbacks.

## Implementation Notes
- Added an authenticated bridge endpoint at `/api/taskforge/v1/auth/session-bridge` that is protected by `SESSION_BRIDGE_SECRET`. When a user hits a protected page, the layout uses server-only helpers to call this endpoint with the signed-in NextAuth profile and sets the returned `tf_session` cookie via the App Router.
- `SESSION_BRIDGE_SECRET` is now required by both the API and web apps (see `infra/env/*.env.example`) so that only the Next.js server can mint API tokens for OAuth users.
- The site header posts to `/api/auth/logout` before invoking `next-auth` sign-out. This route validates same-origin requests, proxies the logout to the API so it can clear the HttpOnly cookie, and mirrors the cookie removal in the Next.js response to keep state aligned.
