# Task: Run Milestone 6 release-readiness verification

## Summary
- Run the final automated and manual checks for the security/docs/CI hardening milestone.
- Record residual risks before moving to Day 7 deployment.

**Status:** Planned.

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
- Confirm production email scheduled sends are still disabled unless all fact-register placeholders and manual-only rollout checks are complete.
- Confirm release notes list residual risks for CORS fallback, trusted proxy, rate limits, explicit body limits, and structured API errors if any remain unresolved.
