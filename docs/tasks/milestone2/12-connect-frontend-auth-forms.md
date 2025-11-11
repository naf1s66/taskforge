# Task: Connect frontend auth forms to backend API

## Summary
- Wire login and registration forms to call the backend REST endpoints and handle responses.
- Persist returned tokens/session data using the chosen auth framework.

**Status:** Completed — Login/register forms call the API credential endpoints and persist the issued session cookie.

## Acceptance Criteria
- [x] Form submissions trigger fetch/Axios calls to `/auth/register` and `/auth/login` endpoints.
- [x] Successful responses update client auth state and navigate to the dashboard.
- [x] Failed responses display validation or server errors without crashing the UI.

## Notes
- Coordinate with backend team on request/response payload contracts.
- Ensure CSRF/token storage strategy aligns with security best practices (httpOnly cookies or secure storage).
- `apps/web/components/auth/login-form.tsx` and `apps/web/components/auth/register-form.tsx` post to `getApiUrl('v1/auth/login|register')` with `credentials: 'include'`, rely on the API-set `tf_session` cookie, push users to `/dashboard`, and surface validation errors returned by the backend.
- Both forms reuse shared error-handling helpers, `aria-live` announcements, and inline helpers so accessibility and UX remain consistent with the auth copy deck.
