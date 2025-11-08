# Task: Bridge NextAuth OAuth logins with API JWT cookies

## Summary
- After a user signs in via NextAuth (GitHub/Google), request a JWT from the API so `tf_session` is issued and backend routes honor the login.
- Ensure sign-out clears both the NextAuth session and the API cookie so auth state stays consistent across stacks.

**Status:** New.

## Acceptance Criteria
- [ ] NextAuth callbacks or server actions exchange the OAuth session for an API JWT (e.g., by calling `/api/taskforge/v1/auth/login` or a dedicated bridge endpoint).
- [ ] Successful OAuth sign-in results in the `tf_session` cookie being set in the browser alongside the NextAuth session cookie.
- [ ] Logging out via the site header clears the API cookie (`/auth/logout`) in addition to ending the NextAuth session.
- [ ] Docs describe how this bridge works so future contributors understand the dual-session story.

## Notes
- Coordinate with backend teammates on whether a dedicated "session sync" endpoint is preferable to reusing the credential login route.
- Ensure CSRF protections and error handling are in place when calling the API from NextAuth callbacks.
