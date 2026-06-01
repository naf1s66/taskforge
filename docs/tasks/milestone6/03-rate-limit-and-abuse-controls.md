# Task: Verify rate limits and abuse controls

## Summary
- Review endpoint-specific abuse controls before public deployment.
- Make limits observable enough that legitimate users are not blocked silently.

**Status:** Complete.

## Acceptance Criteria
- [x] Auth register/login/session endpoints have reasonable rate limits and consistent `429` responses.
- [x] Task and tag mutation endpoints cannot be abused with oversized payloads or unbounded parameters.
- [x] Email preference, digest preview, manual digest send, and protected job endpoints retain stricter controls where needed.
- [x] Protected job endpoints reject missing or incorrect secrets and do not reveal secrets in logs or error bodies.
- [x] Rate limit behavior is tested with trusted proxy settings so `req.ip` cannot be spoofed by untrusted clients.
- [x] README or production docs include the operational implication of rate limits for early deployment.

## Notes
- Avoid relying on rate limits as the only protection for job routes; shared secrets are still required.
- Keep test windows short and deterministic.
- Confirm any dev bypass cannot be enabled in production.

## Verification
- API abuse-control coverage verifies auth `429` behavior, separate session bridge limiting, JSON body limits, trusted-proxy `req.ip` behavior, task/tag bounds, email preference unknown-field rejection, and production dev-bypass denial.
- Job route coverage verifies missing and incorrect `DIGEST_JOB_SECRET` through both `Authorization: Bearer` and `x-job-secret`, no secret echoing/logging, valid-job `429` behavior, strict payload/query validation, and auth-before-limiter ordering.
- Web client and component coverage verifies task title/description/tag/search/board-index bounds before requests are sent.
- OpenAPI was regenerated from source so `docs/openapi.json` documents auth/session/job rate-limit and protected-secret behavior.
- Completed checks:
  - `pnpm -C apps/api lint`
  - `pnpm -C apps/web lint`
  - `pnpm -C apps/api typecheck`
  - `pnpm -C apps/web typecheck`
  - `pnpm -C apps/api test`
  - `pnpm -C apps/web test`
  - `pnpm -C apps/api build`
  - `pnpm -C apps/web build`
  - `pnpm -C apps/api gen:openapi`
  - `git diff --check`
- `docs/testing/milestone6-manual-checklist.md` remains the browser/API smoke checklist for deployment validation.

## Baseline Audit Follow-ups
- [x] Set and test an explicit JSON body-size limit instead of relying on Express' default `express.json()` limit.
- [x] Confirm task, tag, board, email preference, digest preview, and manual digest send schemas reject oversized payloads and unbounded query parameters, with explicit limits for task titles/descriptions, query text, tag array length, tag label length, `pageSize`, board `targetIndex`, digest preview windows, and unknown query/body fields.
- [x] Add focused tests for auth `429` behavior outside the `NODE_ENV=test` bypass or isolate limiter construction so deterministic tests can cover the production limiter settings.
- [x] Add negative tests for missing/wrong `DIGEST_JOB_SECRET` through both `Authorization: Bearer` and `x-job-secret`, ensuring error bodies and logs never echo supplied secret values.
- [x] Exercise rate limits with `TRUST_PROXY` disabled and enabled so untrusted clients cannot spoof `X-Forwarded-For` into separate buckets.
- [x] Decide whether v1 production is constrained to one API instance or add a shared `express-rate-limit` store; document the decision so limits do not silently reset per instance after horizontal scaling.
- [x] Confirm dev bypass remains impossible in production by testing `TF_DEV_BYPASS_AUTH=true` with `NODE_ENV=production` on both API middleware and web current-user resolution.
