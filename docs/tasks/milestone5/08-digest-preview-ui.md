# Task: Add digest preview UI

## Summary
- Show users the task groups that would appear in their next digest.
- Make the preview useful even before email delivery is enabled.

**Status:** New.

## Acceptance Criteria
- [ ] Dashboard or settings page renders the digest preview from the API read model.
- [ ] Empty, loading, error, and disabled-preference states are covered.
- [ ] Preview groups match the email template grouping and counts.
- [ ] UI does not duplicate task business logic already owned by the API digest service.

## Notes
- This should be a compact operational preview, not a marketing page.
- Keep actions limited to enabling/disabling digest and refreshing preview data.
