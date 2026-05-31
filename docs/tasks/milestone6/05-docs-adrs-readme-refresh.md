# Task: Refresh docs, ADRs, and README for release readiness

## Summary
- Bring project documentation into alignment with the release-candidate implementation.
- Make deployment, verification, and known gates clear enough for a reviewer to operate without private context.

**Status:** Planned.

## Acceptance Criteria
- [ ] README reflects the current setup, env vars, Docker workflow, test commands, HTTP packs, and production caveats.
- [ ] PRD milestone status matches shipped behavior through Milestone 6 and clearly separates pending Day 7 deployment work.
- [ ] ADRs capture any final security, deployment, CORS, trusted proxy, Docker build, or release-gate decisions.
- [ ] Production docs include exact placeholder locations for deployment facts without committing real secrets.
- [ ] Milestone task docs for Milestones 1-6 are internally consistent and do not advertise unshipped behavior as complete.
- [ ] Testing docs include Milestone 6 automated and manual verification steps.

## Notes
- Preserve the distinction between "implemented locally" and "enabled in production", especially for email scheduling.
- If docs disagree with code, fix the docs only when it is true drift; otherwise create or update task scope.
- Keep screenshots optional unless the release review explicitly needs them.

## Verification
- Review README, PRD, `docs/prod`, `docs/adr`, `docs/tasks`, and `docs/testing`.
- Run `rg` for stale terms after edits, especially hard-coded domains, obsolete endpoint examples, and old milestone status language.

## Baseline Audit Follow-ups
- Add `TRUST_PROXY` to the README environment reference with guidance to match the actual platform proxy chain and avoid trusting arbitrary forwarded headers.
- Confirm README, `infra/env/*.example`, and `docs/prod` all name the same production placeholders for `CORS_ALLOWED_ORIGINS`, `NEXTAUTH_SECRET`, `SESSION_BRIDGE_SECRET`, `DIGEST_JOB_SECRET`, `CRON_SECRET`, `COOKIE_DOMAIN`, and `TF_DEV_BYPASS_AUTH`.
- Document that the web app has auth and cron API routes only; task/tag/board clients call the API directly rather than through general web proxy routes.
- Preserve the production email gate language: real scheduled sends stay disabled until the production fact register is complete and manual-only Resend/observability checks pass.
- Ensure the release docs distinguish local implementation from production enablement for digest scheduling, Resend, OAuth providers, and cross-subdomain cookies.
