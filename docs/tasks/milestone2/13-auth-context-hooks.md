# Task: Provide global auth context/hooks

## Summary
- Expose reusable hooks or context providers for accessing auth state across the frontend.
- Handle session hydration, token refresh, and logout actions centrally.

**Status:** Completed (merged).

## Acceptance Criteria
- [x] A context/provider wraps the app in `app/providers.tsx` (or similar) to expose auth state.
- [x] Components can call hooks (e.g., `useAuth()`) to read loading/user/error information.
- [x] Logout/sign-in actions trigger updates to the shared state and redirect appropriately.

## Notes
- Ensure SSR compatibility if using NextAuth session provider.
- Document usage patterns for feature teams in README or storybook if available.
