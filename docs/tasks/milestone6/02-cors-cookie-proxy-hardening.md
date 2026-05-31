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
