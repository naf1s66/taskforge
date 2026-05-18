# Task: Add digest preview and send API

## Summary
- Expose protected endpoints for previewing the current user's digest payload.
- Provide a guarded send endpoint for manual QA and future admin tooling.

**Status:** New.

## Acceptance Criteria
- [ ] `GET /api/taskforge/v1/email/digest/preview` returns the authenticated user's digest read model.
- [ ] `POST /api/taskforge/v1/email/digest/send` sends or dry-runs the authenticated user's digest based on request options.
- [ ] Endpoints validate auth, preferences, date window inputs, and dry-run flags.
- [ ] OpenAPI documents request/response shapes and expected error cases.

## Notes
- Keep manual send endpoints protected and rate-limited.
- Dry-run mode should render the same payload without recording a successful delivery.
