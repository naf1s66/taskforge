# Task: Harden CORS, cookies, and trusted proxy settings

## Summary
- Finalize credentialed browser access between deployed web and API origins.
- Ensure cookie and proxy behavior is explicit for local, preview, staging-like, and production environments.

**Status:** Completed.

## Acceptance Criteria
- [x] API CORS uses configured allowed origins only, rejects malformed origins, and supports credentialed browser requests.
- [x] Production docs tell operators to set `CORS_ALLOWED_ORIGINS` to the exact deployed web origin list without paths.
- [x] Cookie settings document `COOKIE_DOMAIN`, `SameSite`, `Secure`, and cross-subdomain expectations for the chosen deployment topology.
- [x] `TRUST_PROXY` behavior is validated for local development and the chosen API host, with warnings against trusting arbitrary forwarded headers.
- [x] Automated tests cover local defaults, production origin parsing, invalid origins, and trusted proxy parsing.
- [x] Manual checklist includes a deployed-browser smoke where authenticated web requests reach the API with cookies.

## Notes
- Milestone 5 introduced configurable CORS origins; Milestone 6 should verify the whole browser/auth/deployment path.
- Do not hard-code production domains in runtime code.
- Preview deployments may need their own explicit origin entries or a documented decision not to support preview-to-production API calls.

## Verification
- Run focused HTTP config tests after changes.
- Confirm browser requests include credentials and do not fail preflight in the deployed target environment.

## Completion Notes
- Production CORS now fails closed when `CORS_ALLOWED_ORIGINS` is unset, while local defaults continue to allow `http://localhost:3000` and `http://127.0.0.1:3000`.
- Runtime CORS rejects malformed, pathful, and unlisted browser origins with structured JSON errors and credentialed responses for configured origins.
- `TRUST_PROXY` remains explicit-only, with parsing and rate-limit IP behavior covered for unset/local, `false`, hop-count, proxy-list, and invalid values.
- Cookie-domain handling is explicit-only: leaving `COOKIE_DOMAIN` unset creates host-only cookies, and same-site cross-subdomain deployments must set a shared parent domain intentionally.
- The supported production browser-auth topology is same-site custom domains or API-behind-web-origin. Raw unrelated Vercel/Render/Railway default hostnames remain unsupported for the OAuth session bridge cookie handoff.
- `/auth/session-bridge` now has tests for no-store redirects, safe return-path handling, authenticated-user requirements, existing-cookie probes, and API-cookie setting.
- API route errors now use structured JSON, and unmatched API routes no longer fall through to Express' default HTML response.

## Baseline Audit Follow-ups
- [x] Production CORS fails closed unless `CORS_ALLOWED_ORIGINS` is explicit; the old hard-coded fallback origin was removed and configured/local-default behavior is covered by tests.
- Preserve local no-origin/curl behavior while proving malformed, pathful, and unlisted browser origins fail safely.
- Document the selected cookie topology for same-origin, cross-subdomain, and preview deployments, including `COOKIE_DOMAIN`, `SameSite=Lax`, `Secure`, `httpOnly`, and the seven-day API session cookie lifetime.
- Verify `/auth/session-bridge` cache, redirect sanitization, authenticated-user requirement, existing-cookie probe behavior, and cookie-setting behavior for the selected topology.
- Add/verify `TRUST_PROXY` parsing and rate-limit IP tests for local defaults, `false`, hop count `1`, proxy lists, and invalid numeric/string values.
- Verify README and production-doc entries for `TRUST_PROXY` stay aligned with `CORS_ALLOWED_ORIGINS` and cookie settings.
- Add or verify a structured Express error handler so CORS and route errors do not fall through to default HTML/stack responses in production.
