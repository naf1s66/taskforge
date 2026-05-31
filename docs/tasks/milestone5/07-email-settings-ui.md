# Task: Add email settings UI

## Summary
- Add a web settings surface for daily digest preferences.
- Let users see and change whether digest emails are enabled.

**Status:** Completed.

## Acceptance Criteria
- [x] Authenticated users can view current email preference state from the web app.
- [x] Users can enable/disable daily digest emails with optimistic feedback and rollback on failure.
- [x] Settings UI explains delivery timing without exposing internal scheduler details.
- [x] Preference mutations update the API and React Query cache consistently.

## Notes
- Prefer a small settings panel over a broad account-settings redesign.
- Keep welcome email preferences out of the first UI unless product requirements demand it.

## Implementation Notes
- Added `/api/taskforge/v1/me/email-preferences` for authenticated daily digest preference updates.
- Extended `/api/taskforge/v1/me` so the web app can read the current daily digest preference alongside the session user.
- Added a compact dashboard account panel control that shows digest status, explains delivery at a product level, and toggles daily digest emails.
- Web preference hooks use React Query optimistic updates, restore previous cache data on failure, and remove first-write optimistic cache entries when the mutation fails before a preference was loaded.
- Welcome email preferences remain API/model-only and are intentionally not surfaced in this first UI.
