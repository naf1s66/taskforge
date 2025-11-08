# Task: Create protected dashboard page

## Summary
- Implement a basic dashboard view that requires authentication to access.
- Display placeholder task data to confirm the protected route wiring works.

**Status:** Pending — route protection works, but the dashboard still shows static placeholder content.

## Acceptance Criteria
- [x] Dashboard route uses server-side or client-side guards to restrict access to authenticated users.
- [x] Unauthenticated visitors are redirected to the login page.
- [ ] Authenticated users see their profile info and/or seeded task overview.

## Notes
- Leverage Next.js middleware or server components to enforce protection depending on chosen auth approach.
- Coordinate with redirect logic task to avoid duplicate implementations.
