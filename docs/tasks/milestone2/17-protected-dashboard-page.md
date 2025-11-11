# Task: Create protected dashboard page

## Summary
- Implement a basic dashboard view that requires authentication to access.
- Display placeholder task data to confirm the protected route wiring works.

**Status:** Completed — the protected dashboard fetches per-user tasks from the API and renders the authenticated profile header.

## Acceptance Criteria
- [x] Dashboard route uses server-side or client-side guards to restrict access to authenticated users.
- [x] Unauthenticated visitors are redirected to the login page.
- [x] Authenticated users see their profile info and/or seeded task overview.

## Notes
- Leverage Next.js middleware or server components to enforce protection depending on chosen auth approach.
- Coordinate with redirect logic task to avoid duplicate implementations.
- `apps/web/app/(protected)/layout.tsx` + `getCurrentUser()` gate access, ensure the `tf_session` cookie is refreshed via `/auth/session-bridge`, and redirect anonymous visitors to `/login`.
- `apps/web/app/(protected)/dashboard/page.tsx` pulls tasks via `getApiUrl('v1/tasks')` with the session cookie, builds `DashboardContent`, and surfaces the signed-in user's profile data with optimistic placeholder cards only when no tasks exist yet.
