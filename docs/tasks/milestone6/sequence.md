# Milestone 6 Task Sequence (Security Hardening + Release Readiness)

Scope note: Milestone 6 is a hardening and release-readiness milestone, not a feature expansion milestone. It should turn the Milestones 1-5 product surface into a deployable candidate by tightening security middleware, API documentation, deployment docs, Docker build coverage, and release gates.

1. **01-security-baseline-audit.md** - Audit the current API/web security posture before changing middleware.
2. **02-cors-cookie-proxy-hardening.md** - Finalize credentialed CORS, cookie, and trusted-proxy behavior for local, preview, and production deployments.
3. **03-rate-limit-and-abuse-controls.md** - Verify rate limits and abuse controls across auth, task, email, and job endpoints.
4. **04-openapi-finalization.md** - Finalize Swagger/OpenAPI coverage and regenerate the committed artifact.
5. **05-docs-adrs-readme-refresh.md** - Refresh README, PRD, ADRs, deployment notes, and milestone docs for the release candidate.
6. **06-ci-docker-builds.md** - Add or verify CI Docker image builds for API and web plus compose validation.
7. **07-security-http-pack-and-smoke.md** - Add repeatable HTTP/manual smoke checks for hardening behavior.
8. **08-milestone6-verification.md** - Run the full automated/manual Milestone 6 release-readiness gate and document residual risks.
