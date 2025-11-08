# Task: Implement loading and error states for auth flows

## Summary
- Provide user feedback during async auth operations (submitting forms, fetching session).
- Surface backend validation or server errors gracefully in the UI.

**Status:** Pending — UI still lacks API error handling and register form coverage.

## Acceptance Criteria
- [ ] Login/register forms show loading indicators while awaiting responses.
- [ ] Error messages from the API are mapped to user-friendly alerts/toasts.
- [ ] Global auth context exposes status flags (idle/loading/authenticated/error) for downstream components.

## Notes
- Consider using shadcn/ui components (Alert, Toast) for consistency.
- Ensure accessibility (e.g., `aria-live`) for status updates.
