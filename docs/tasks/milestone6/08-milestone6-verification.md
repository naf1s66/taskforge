# Task: Run Milestone 6 release-readiness verification

## Summary
- Run the final automated and manual checks for the security/docs/CI hardening milestone.
- Record residual risks before moving to Day 7 deployment.

**Status:** Pending final verification.

## Acceptance Criteria
- [ ] All commands in `docs/testing/milestone6-automated.md` pass or have an explicit documented blocker.
- [ ] Manual checks in `docs/testing/milestone6-manual-checklist.md` are completed for local Docker and, if available, a preview deployment.
- [ ] `docs/openapi.json` has no uncommitted drift after generation.
- [ ] Docker build/compose validation has passed in CI or an equivalent local run is documented.
- [ ] Release-candidate docs list remaining Day 7 deployment steps and production email gates.
- [ ] Any unresolved issues are converted into follow-up task docs or release blockers, not buried in chat history.

## Notes
- This task should be the last Milestone 6 task before deployment provisioning starts.
- Do not merge into Day 7 with unknown test failures or undocumented environment requirements.

## Verification
- Use `docs/testing/milestone6-automated.md` as the command source of truth.
- Use `docs/testing/milestone6-manual-checklist.md` for browser and deployment-path checks.

## Baseline Audit Follow-ups
- Before marking this task complete, verify every follow-up from `01-security-baseline-audit.md` was either implemented in Milestone 6 or converted into an explicit release blocker.
- Re-run the security-sensitive `rg` inventory for `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY`, `CRON_SECRET`, `DIGEST_JOB_SECRET`, `NEXTAUTH_SECRET`, `COOKIE_DOMAIN`, and `TF_DEV_BYPASS_AUTH` and confirm no undocumented production requirement remains.
- Confirm `/auth/session-bridge` is included in final web-route verification for authenticated-user checks, redirect sanitization, API-cookie minting, and cache behavior.
- Confirm production email scheduled sends are still disabled unless all fact-register placeholders and manual-only rollout checks are complete.
- Confirm release notes list residual risks for CORS fallback, trusted proxy, rate-limit store topology, explicit body/query limits, session-bridge cookie handling, and structured API errors if any remain unresolved.


## Current Release-Candidate State
- Documentation gates for README, PRD, ADRs, production placeholders, and Milestone 6 testing references have been refreshed.
- Final automated command execution and manual browser/deployment-path smoke remain pending until the release reviewer runs `docs/testing/milestone6-automated.md` and `docs/testing/milestone6-manual-checklist.md`.
- Docker image-build evidence is now covered by CI compose validation plus API/web image builds; final sign-off should inspect the latest CI run or repeat the documented local Docker commands if CI evidence is unavailable.
- Production email scheduled sends remain disabled unless all production fact-register placeholders are filled and manual-only Resend/observability checks pass.
