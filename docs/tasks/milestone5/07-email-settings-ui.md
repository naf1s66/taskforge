# Task: Add email settings UI

## Summary
- Add a web settings surface for daily digest preferences.
- Let users see and change whether digest emails are enabled.

**Status:** New.

## Acceptance Criteria
- [ ] Authenticated users can view current email preference state from the web app.
- [ ] Users can enable/disable daily digest emails with optimistic feedback and rollback on failure.
- [ ] Settings UI explains delivery timing without exposing internal scheduler details.
- [ ] Preference mutations update the API and React Query cache consistently.

## Notes
- Prefer a small settings panel over a broad account-settings redesign.
- Keep welcome email preferences out of the first UI unless product requirements demand it.
