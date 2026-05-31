# Task: Verify rate limits and abuse controls

## Summary
- Review endpoint-specific abuse controls before public deployment.
- Make limits observable enough that legitimate users are not blocked silently.

**Status:** Planned.

## Acceptance Criteria
- [ ] Auth register/login/session endpoints have reasonable rate limits and consistent `429` responses.
- [ ] Task and tag mutation endpoints cannot be abused with oversized payloads or unbounded parameters.
- [ ] Email preference, digest preview, manual digest send, and protected job endpoints retain stricter controls where needed.
- [ ] Protected job endpoints reject missing or incorrect secrets and do not reveal secrets in logs or error bodies.
- [ ] Rate limit behavior is tested with trusted proxy settings so `req.ip` cannot be spoofed by untrusted clients.
- [ ] README or production docs include the operational implication of rate limits for early deployment.

## Notes
- Avoid relying on rate limits as the only protection for job routes; shared secrets are still required.
- Keep test windows short and deterministic.
- Confirm any dev bypass cannot be enabled in production.

## Verification
- Add or update API tests for `429` behavior where coverage is missing.
- Use `docs/testing/milestone6-manual-checklist.md` for a browser/API smoke of important blocked paths.

## Baseline Audit Follow-ups
- Set and test an explicit JSON body-size limit instead of relying on Express' default `express.json()` limit.
- Confirm task, tag, board, email preference, digest preview, and manual digest send schemas reject oversized payloads and unbounded query parameters.
- Add focused tests for auth `429` behavior outside the `NODE_ENV=test` bypass or isolate limiter construction so deterministic tests can cover the production limiter settings.
- Add negative tests for missing/wrong `DIGEST_JOB_SECRET` through both `Authorization: Bearer` and `x-job-secret`, ensuring error bodies and logs never echo supplied secret values.
- Exercise rate limits with `TRUST_PROXY` disabled and enabled so untrusted clients cannot spoof `X-Forwarded-For` into separate buckets.
- Confirm dev bypass remains impossible in production by testing `TF_DEV_BYPASS_AUTH=true` with `NODE_ENV=production` on both API middleware and web current-user resolution.
