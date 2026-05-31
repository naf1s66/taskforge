# Task: Harden CORS, cookies, and trusted proxy settings

## Summary
- Finalize credentialed browser access between deployed web and API origins.
- Ensure cookie and proxy behavior is explicit for local, preview, staging-like, and production environments.

**Status:** Planned.

## Acceptance Criteria
- [ ] API CORS uses configured allowed origins only, rejects malformed origins, and supports credentialed browser requests.
- [ ] Production docs tell operators to set `CORS_ALLOWED_ORIGINS` to the exact deployed web origin list without paths.
- [ ] Cookie settings document `COOKIE_DOMAIN`, `SameSite`, `Secure`, and cross-subdomain expectations for the chosen deployment topology.
- [ ] `TRUST_PROXY` behavior is validated for local development and the chosen API host, with warnings against trusting arbitrary forwarded headers.
- [ ] Automated tests cover local defaults, production origin parsing, invalid origins, and trusted proxy parsing.
- [ ] Manual checklist includes a deployed-browser smoke where authenticated web requests reach the API with cookies.

## Notes
- Milestone 5 introduced configurable CORS origins; Milestone 6 should verify the whole browser/auth/deployment path.
- Do not hard-code production domains in runtime code.
- Preview deployments may need their own explicit origin entries or a documented decision not to support preview-to-production API calls.

## Verification
- Run focused HTTP config tests after changes.
- Confirm browser requests include credentials and do not fail preflight in the deployed target environment.

## Baseline Audit Follow-ups
- Decide whether the API should keep the production fallback `https://taskforge.app` or fail closed unless `CORS_ALLOWED_ORIGINS` is explicit in production; document the decision and add tests for both configured and fallback behavior.
- Preserve local no-origin/curl behavior while proving malformed, pathful, and unlisted browser origins fail safely.
- Document the selected cookie topology for same-origin, cross-subdomain, and preview deployments, including `COOKIE_DOMAIN`, `SameSite=Lax`, `Secure`, `httpOnly`, and the seven-day API session cookie lifetime.
- Verify `/auth/session-bridge` cache, redirect sanitization, authenticated-user requirement, existing-cookie probe behavior, and cookie-setting behavior for the selected topology.
- Add/verify `TRUST_PROXY` parsing and rate-limit IP tests for local defaults, `false`, hop count `1`, proxy lists, and invalid numeric/string values.
- Verify README and production-doc entries for `TRUST_PROXY` stay aligned with `CORS_ALLOWED_ORIGINS` and cookie settings.
- Add or verify a structured Express error handler so CORS and route errors do not fall through to default HTML/stack responses in production.
