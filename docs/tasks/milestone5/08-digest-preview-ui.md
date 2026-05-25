# Task: Add digest preview UI

## Summary
- Show users the task groups that would appear in their next digest.
- Make the preview useful even before email delivery is enabled.

**Status:** Completed.

## Acceptance Criteria
- [x] Dashboard or settings page renders the digest preview from the API read model.
- [x] Empty, loading, error, and disabled-preference states are covered.
- [x] Preview groups match the email template grouping and counts.
- [x] UI does not duplicate task business logic already owned by the API digest service.

## Notes
- This should be a compact operational preview, not a marketing page.
- Keep actions limited to enabling/disabling digest and refreshing preview data.

## Implementation Notes
- Added a compact dashboard digest preview under the daily digest preference control.
- Preview data is read from `GET /api/taskforge/v1/email/digest/preview` and renders the API-provided group labels and totals without rebuilding digest business logic in the UI.
- Disabled preferences now show an explanatory state while still rendering the current preview read model.
- Task mutations invalidate the digest preview cache so refreshed task lists and preview counts stay aligned.
