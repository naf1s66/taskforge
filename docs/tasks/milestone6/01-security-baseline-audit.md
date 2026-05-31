# Task: Audit security baseline

## Summary
- Inventory the security-sensitive behavior already shipped across API, web, Docker, CI, and production docs.
- Identify gaps before editing middleware so Milestone 6 work stays focused on release readiness.

**Status:** Planned.

## Acceptance Criteria
- [ ] API middleware inventory covers Helmet, CORS, cookie parsing, request body limits, auth middleware, rate limits, trusted proxy behavior, and error handling.
- [ ] Web inventory covers NextAuth session settings, API proxy routes, cron proxy auth, cookie handling, and any dev-only bypass behavior.
- [ ] Environment inventory confirms all required production values are documented in `infra/env/*.example`, README, and production runbooks.
- [ ] Existing Milestone 5 email rollout gates remain explicit: real scheduled sends must stay disabled until production email facts are filled.
- [ ] Findings are recorded as concrete follow-up edits in the relevant Milestone 6 task docs instead of broad notes.

## Notes
- Treat previously completed Milestone 5 cleanup as input, not proof. Re-check the actual runtime paths and tests.
- Do not add new product behavior in this audit task.
- Keep any secret names documented, but never commit secret values.

## Verification
- `rg` or code search for security-sensitive config keys: `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY`, `CRON_SECRET`, `DIGEST_JOB_SECRET`, `NEXTAUTH_SECRET`, `COOKIE_DOMAIN`, `TF_DEV_BYPASS_AUTH`.
- Review `apps/api/src/app.ts`, API config modules, web API routes, `infra/env`, README, and `docs/prod`.
