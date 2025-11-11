# Task: Implement auth-based redirect logic

## Summary
- Ensure routing guards redirect unauthenticated users to `/login` and authenticated users away from auth pages to the dashboard.
- Handle redirects consistently on both server and client navigation.

**Status:** Completed (merged).

## Acceptance Criteria
- [x] Visiting protected routes while unauthenticated leads to `/login` with return path preserved when appropriate.
- [x] Authenticated users visiting `/login` or `/register` are redirected to the dashboard.
- [x] Logic accounts for loading states to avoid flicker or redirect loops.

## Notes
- Use Next.js middleware or route handlers to enforce redirects early when possible.
- Keep logic in sync with global auth context/hooks to prevent duplication.
