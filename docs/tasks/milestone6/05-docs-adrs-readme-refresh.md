# Task: Refresh docs, ADRs, and README for release readiness

## Summary
- Bring project documentation into alignment with the release-candidate implementation.
- Make deployment, verification, and known gates clear enough for a reviewer to operate without private context.

**Status:** Completed.

## Acceptance Criteria
- [x] README reflects the current setup, env vars, Docker workflow, test commands, HTTP packs, and production caveats.
- [x] PRD milestone status matches shipped behavior through Milestone 6 and clearly separates pending Day 7 deployment work.
- [x] ADRs capture any final security, deployment, CORS, trusted proxy, Docker build, or release-gate decisions.
- [x] Production docs include exact placeholder locations for deployment facts without committing real secrets.
- [x] Milestone task docs for Milestones 1-6 are internally consistent and do not advertise unshipped behavior as complete.
- [x] Testing docs include Milestone 6 automated and manual verification steps.

## Notes
- Preserve the distinction between "implemented locally" and "enabled in production", especially for email scheduling.
- If docs disagree with code, fix the docs only when it is true drift; otherwise create or update task scope.
- Keep screenshots optional unless the release review explicitly needs them.

## Verification
- Review README, PRD, `docs/prod`, `docs/adr`, `docs/tasks`, and `docs/testing`.
- Run `rg` for stale terms after edits, especially hard-coded domains, obsolete endpoint examples, and old milestone status language.

## Baseline Audit Follow-ups
- Verify the README and production docs keep `TRUST_PROXY` guidance aligned with the actual platform proxy chain and warnings against trusting arbitrary forwarded headers.
- Confirm README, `infra/env/*.example`, and `docs/prod` all name the same production placeholders for `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_SECRET`, `SESSION_BRIDGE_SECRET`, `DIGEST_JOB_SECRET`, `CRON_SECRET`, `COOKIE_DOMAIN`, and `TF_DEV_BYPASS_AUTH`.
- Document that the web app has auth, session-bridge, and cron server routes only; task/tag/board clients call the API directly rather than through general web proxy routes.
- Document the rate-limit deployment assumption: either v1 runs a single API instance with in-process limiter state, or production uses a shared rate-limit store before horizontal scaling.
- Preserve the production email gate language: real scheduled sends stay disabled until the production fact register is complete and manual-only Resend/observability checks pass.
- Ensure the release docs distinguish local implementation from production enablement for digest scheduling, Resend, OAuth providers, and cross-subdomain cookies.


## Completion Notes
- README now documents env placeholders, direct browser-to-API task/tag/board access, Docker/compose validation commands, production caveats, and the local-implemented versus production-enabled split for OAuth, Resend, digest scheduling, and cookies.
- PRD now tracks Days 1-6 as shipped locally/release-candidate work and keeps Day 7 deployment provisioning pending.
- Production docs now include a placeholder map for `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_SECRET`, `SESSION_BRIDGE_SECRET`, `DIGEST_JOB_SECRET`, `CRON_SECRET`, `COOKIE_DOMAIN`, and `TF_DEV_BYPASS_AUTH` without real secrets.
- ADR 0008 records the final release-candidate gates for browser routing, CORS/cookies, trusted proxy, rate-limit topology, Docker build validation, and email enablement.
- CI now proves the Milestone 6 Docker image build gate and generated OpenAPI artifact drift gate; Day 7 release sign-off still needs real deployment facts and production smoke evidence.
