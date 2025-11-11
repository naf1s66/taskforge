# Task: Implement loading and error states for auth flows

## Summary
- Provide user feedback during async auth operations (submitting forms, fetching session).
- Surface backend validation or server errors gracefully in the UI.

**Status:** Completed — forms and shared auth context now expose loading/error states end-to-end.

## Acceptance Criteria
- [x] Login/register forms show loading indicators while awaiting responses.
- [x] Error messages from the API are mapped to user-friendly alerts/toasts.
- [x] Global auth context exposes status flags (idle/loading/authenticated/error) for downstream components.

## Notes
- Consider using shadcn/ui components (Alert, Toast) for consistency.
- Ensure accessibility (e.g., `aria-live`) for status updates.
- Auth forms (`apps/web/components/auth/*.tsx`) now disable submit buttons, render `Loader2` icons, and pipe API validation/runtime errors into shadcn `Alert` components with `aria-live` copy.
- `apps/web/lib/use-auth.tsx` derives `idle/loading/authenticated/error` states from NextAuth + `/api/auth/me` responses, and `SiteHeader` renders retry/alert affordances plus sign-out flows accordingly.
