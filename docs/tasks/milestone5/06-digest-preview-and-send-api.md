# Task: Add digest preview and send API

## Summary
- Expose protected endpoints for previewing the current user's digest payload.
- Provide a guarded send endpoint for manual QA and future admin tooling.

**Status:** Completed.

## Acceptance Criteria
- [x] `GET /api/taskforge/v1/email/digest/preview` returns the authenticated user's digest read model.
- [x] `POST /api/taskforge/v1/email/digest/send` sends or dry-runs the authenticated user's digest based on request options.
- [x] Endpoints validate auth, preferences, date window inputs, and dry-run flags.
- [x] OpenAPI documents request/response shapes and expected error cases.

## Notes
- Keep manual send endpoints protected and rate-limited.
- Dry-run mode should render the same payload without recording a successful delivery.

## Implementation Notes
- Added protected `/api/taskforge/v1/email/digest/preview` and `/api/taskforge/v1/email/digest/send` routes behind the shared auth middleware.
- Preview uses `DailyDigestQueryService` directly and remains available even when SMTP delivery is not configured.
- Manual send delegates to `DailyDigestRunner` with the authenticated user's id, configured daily send budget, local digest-date defaults, preference checks, idempotency, and dry-run behavior.
- OpenAPI now includes digest preview/send schemas, examples, and expected `400`, `401`, `409`, `429`, and `503` error cases.
